# Tarjonta-pulssi

Tarjonta-pulssi on palvelu, joka koostaa koulutustarjontaan (kouta/konfo) liittyviä tunnuslukuja ja esittää niitä.

## Arkkitehtuuri

Palvelu on rakennettu [AWS CDK](https://docs.aws.amazon.com/cdk/) ja [React Router](https://reactrouter.com/) -framework:eja käyttäen. Palvelu koostuu karkeasti kuvattuna web-sovelluksesta, kolmesta erillisestä AWS-lambdasta ja PostgreSQL-tietokannasta.
Web-sovellus tarjoillaan CloudFrontin (CDN) kautta: staattiset tiedostot S3 -ämpäristä ja palvelinpuolen renderöinti (SSR) Lambdasta, jota CloudFront kutsuu suoraan Lambda Function URL:in kautta.
Ensimmäinen lambda-funktio (updater) hakee lukumääriä ElasticSearch:ista ja tallentaa niitä palvelun omaan PostgreSQL-tietokantaan. Toinen lambda / API (dbApi) tarjoaa sovellukselle rajapinnan datan hakemiseen tietokannasta.
Kolmas lambda-funktio on tietokantamigraatioiden ajamista varten ja suoritetaan deployn yhteydessä.

Tietojen esittämistä varten on toteutettu yhden sivun sovellus React Router -framework:in päälle. UI -kirjastona on käytetty [Reactia](https://react.dev/). Sovelluksessa käytetään [MUI](https://mui.com/) -kirjaston tarjoamia käyttöliittymäkomponentteja.

### CloudFront ja Lambda Function URL

SSR-lambda on CloudFrontin takana Lambda Function URL:in kautta, suojattuna Origin Access Controlilla (OAC). CloudFront allekirjoittaa pyynnöt (SigV4), eikä Lambda tue allekirjoittamatonta bodyä: PUT/POST vaatisi selaimelta `x-amz-content-sha256` -otsakkeen, mihin se ei pysty. **Tämä reitti kelpaa siis vain GET/HEAD-liikenteelle.** Sovelluksessa ei ole yhtään `action`-exporttia eikä lomaketta, joten rajoitus ei pure. Jos sellainen lisätään, SSR-lambda on siirrettävä API Gatewayn taakse.

### Lokitus

| Mitä                                                 | Missä                                                      | Säilytys |
| ---------------------------------------------------- | ---------------------------------------------------------- | -------- |
| SSR-lambdan pyyntöloki (`"type":"access"`)           | CloudWatch Logs, SSR-lambdan lokiryhmä                     | 2 vuotta |
| Muiden lambdojen lokit (dbApi, updater, migraattori) | CloudWatch Logs, `/aws/lambda/<stack>-<funktio>`           | 2 vuotta |
| CloudFront access log                                | S3, stackin `accesslogbucket`-output, prefix `cloudfront/` | 2 vuotta |

#### SSR-lambdan pyyntöloki

`server/lambda.ts` kirjoittaa jokaisesta pyynnöstä yhden JSON-rivin: metodi, polku,
kyselymerkkijono, HTTP-status, kesto millisekunteina, katsojan IP, user-agent ja
`requestId`. Rivit syntyvät vain HTML- ja data-pyynnöistä — staattiset assetit eivät kulje
SSR-lambdan kautta. Haku Logs Insightsilla:

```
fields @timestamp, ip, method, path, status, durationMs, userAgent
| filter type = "access"
| sort @timestamp desc
```

Kaksi asiaa, joiden varassa tämä on:

- **IP luetaan `X-Forwarded-For` -ketjun viimeisestä alkiosta**, ei
  `requestContext.http.sourceIp`:stä — jälkimmäinen on CloudFrontin reunapalvelin.
  CloudFront lisää katsojan IP:n ketjun loppuun, joten vain viimeinen alkio on sellainen,
  jota selain ei voi väärentää.
- **User-agent on oikea vain origin request policyn ansiosta.** Jos
  `ALL_VIEWER_EXCEPT_HOST_HEADER` joskus vaihdetaan, CloudFront korvaa otsakkeen arvolla
  `Amazon CloudFront` — mikä rikkoisi myös `isbot`-tunnistuksen `entry.server.tsx`:ssä.

#### CloudFront access log

Kattaa **kaikki** selainpyynnöt — myös staattiset assetit ja välimuistiosumat, jotka eivät
koskaan päädy SSR-lambdalle. Muoto on gzipattu W3C-tabulaattorieroteltu tiedosto, toimitus
tunneittain ja best-effort-periaatteella, eli yksittäinen rivi voi saapua viiveellä tai jäädä
kokonaan pois. Analysointiin käytännöllisin työkalu on Athena.

#### Tietosuoja

Sekä CloudFrontin access log että SSR-lambdan pyyntöloki **sisältävät asiakkaan
IP-osoitteen**. Säilytysaika on kaikilla lokeilla kaksi vuotta — se on tietosuojapäätös, ei
tekninen, ja se on tehty tietoisesti. Arvot ovat vakioissa `ACCESS_LOG_RETENTION` (S3:n
lifecycle-sääntö) ja `SSR_LOG_RETENTION` sekä lambdakohtaisissa `logRetention`-asetuksissa
tiedostossa `stacks/tarjonta-pulssi.ts`. Evästeitä ei lokiteta kummassakaan.

Tuotannossa (`sade`) lokiämpäri säilyy vaikka stack poistettaisiin; testiympäristöissä se
siivotaan stackin mukana.

Huom. että **dbApi:lla ei ole omaa access logia**. Se ei ole julkisesti liikennöity rajapinta —
ainoa kutsuja on SSR-lambda — mutta katvealue on hyvä tiedostaa.

## Hakemistorakenne

- CDK-sovelluksen käynnistystiedosto löytyy hakemistosta `bin` ja stackien määrittelyt hakemistosta `stacks`.
- Lambda-funktioden lähdekoodit löytyvät hakemistosta `functions`.
- Web-sovelluksen koodit löytyvät hakemistosta `app`.
- SSR-lambdan handler löytyy hakemistosta `server`.
- Yhteiset, sekä lamdoissa että web-sovelluksessa käytettävät koodit löytyvät hakemistosta `shared`.
- Tietokantamigraatiot löytyvät hakemistosta `shared/db/migrations`.

### Esivaatimukset

- aws-profiilit ovat käyttäjän kotihakemistossa `cloud-base` - repositorystä löytyvän `tools/config-wizard.sh` mukaiset.
- pnpm asennettuna, versio 10.26.0 tai uudempi
- node asennettuna, `.nvmrc`:n mukainen versio
- [Docker](https://www.docker.com/get-started) PostgreSQLää varten.

### Sovelluksen rakentaminen tyhjästä AWS:ään

#### Tietokanta (cloud-base repositoryssä)

##### Luo tietokannan luontia varten tarvittavat salaisuudet (älä sisällytä merkkejä / , ` , @ )

`aws/config.py ymparisto put-secret -k postgresqls/tarjontapulssi/master-user-password`  
`aws/config.py ymparisto put-secret -k postgresqls/tarjontapulssi/app-user-password`  
`aws/config.py ymparisto put-secret -k postgresqls/tarjontapulssi/readonly-user-password`
`aws/config.py ymparisto put-secret -k postgresqls/tarjontapulssi/app-user-name`  
`aws/config.py ymparisto put-secret -k postgresqls/tarjontapulssi/readonly-user-name`

##### Lisää tietokanta stacks.json:iin (tarvitsee tehdä vain kerran ja toimii kaikkien ympäristöjen kanssa)

`vim aws/templates/stacks.json`

##### Lisää tietokanta environment.json:iin

`vim aws/environments/ymparisto/environment.json`

##### Luo tietokanta

`aws/cloudformation.py ymparisto postgresqls create -s tarjontapulssi`

##### Luo tietokantakäyttäjät

`cd tools/db`  
`./update-postgres-db-roles.sh ymparisto tarjontapulssi`

#### Deployaa tarjonta-pulssi sovellus (tarjonta-pulssi -repositoryssä)

```sh
pnpm run cdk:deploy -c stage=<ympäristö> --profile <oph-dev / oph-prod>
```

Ympäristö on joko `untuva`, `hahtuva`, `pallero` tai `sade` (= tuotanto)
Profiili on sade / tuotanto -ympäristössä `oph-prod`, muissa `oph-dev`

Deploy **vaatii voimassa olevat AWS-tunnukset**: CDK päättelee niistä kohdetilin, eikä
stackia voi syntetisoida ilman sitä. Jos ajat useita komentoja peräkkäin, aws-vault-sessio
säästää toistuvilta MFA-kyselyiltä, jolloin `--profile` on tarpeeton:

```sh
aws-vault exec <oph-dev / oph-prod>
pnpm run cdk:deploy -c stage=<ympäristö>
```

`cdk:deploy` ajaa ensin `react-router build`:in, koska SSR-lambda bundlataan käännetystä palvelinbuildista. Deployattavat muutokset kannattaa katsoa ensin läpi komennolla `pnpm run cdk:diff -c stage=<ympäristö>`.

> **Älä käytä `--`-erotinta** näissä komennoissa. pnpm välittää sen sellaisenaan eteenpäin, jolloin komennoksi tulee `cdk deploy --all -- -c stage=…`. CDK:n argumenttijäsennin lopettaa valitsimien lukemisen `--`:ään, joten `-c` jää huomiotta ja deploy kaatuu virheeseen `Unknown stack environment (stage) "undefined"`.
>
> Jos tunnukset puuttuvat tai profiilin nimi on väärin, CDK **ei valita siitä** vaan jättää
> kohdetilin tyhjäksi. Stack tarkistaa tämän ja kaatuu selkeään virheeseen; ilman tarkistusta
> vika ilmenisi vasta VPC-haussa muodossa `Cannot retrieve value from context provider vpc-provider`.

Sovellus muodostuu kahdesta stackista: `<ympäristö>-tarjonta-pulssi-app-CERT` (us-east-1, CloudFrontin vaatima sertifikaatti) ja `<ympäristö>-tarjonta-pulssi-app-TARJONTAPULSSI` (eu-west-1, kaikki muu).

Komennon ajamisesta tehty seuraavia huomioita (ajettu macOS:ssä).

- Komentoa ajettaessa kannattaa asettaa ympäristömuuttuja `export NPM_CONFIG_IGNORE_SCRIPTS=true`. Tällöin deploy ei vaadi `pg_config` -työkalua.
- Tarvittaessa `pg_config` -työkalun voi kopioida PostgreSQL -kontin sisältä (kontin käynnistämiseksi kts. Ajaminen lokaalia PostgreSQL -kantaa vasten) komennolla `docker cp tarjontapulssi-database:/usr/bin/pg_config <kohdehakemisto>`. Vaihtoehtoinen tapa on asentaa PostgreSQL omalle koneelle.
- `xcrun` -työkalu täytyy olla asennettuna ja oikein konfiguroituna. Tämä onnistuu komennolla `xcode-select --install`.

#### Ensimmäinen deploy SST:stä siirryttäessä

Vanha SST-pohjainen CloudFront-distribuutio ja sen Route53-tietue käyttävät samaa domainia kuin uusi. CloudFront ei salli kahta distribuutiota samalla aliaksella, ja CloudFormation luo uudet resurssit ennen kuin poistaa vanhat — eli samassa päivityksessä tehtynä deploy kaatuisi virheeseen `CNAMEAlreadyExists`.

Siksi ensimmäinen deploy ajetaan **ympäristöä kohden kahdessa vaiheessa**: ensin ilman omaa domainia (jolloin vanhat resurssit ehtivät poistua), sitten normaalisti.

```sh
pnpm run cdk:deploy -c stage=<ympäristö> -c skipDomain=true
pnpm run cdk:deploy -c stage=<ympäristö>
```

Vaiheiden välissä sovelluksen voi tarkistaa stackin `cloudfronturl`-outputista. Myöhemmillä deployilla `skipDomain`-lippua ei käytetä.

### Tietokantamigraatiot

Tietokantamigraatiot on toteutettu [Umzug](https://github.com/sequelize/umzug)-kirjastolla ja ne löytyvät hakemistosta `shared/db/migrations`. Migraatiot ajetaan lambdassa automaattisesti deployn yhteydessä ja ne on toteutettu JavaScript CommonJS-moduuleina, jotta niitä on helpompi ajaa lambdassa.

Migraatiot voi ajaa myös käsin. Jos haluat ajaa migraatioita käsin esim. untuvaa vasten, aseta ensin VPN päälle ja tunneloi haluamasi ympäristön tietokantayhteys localhostiin. Lisää migrate.ts:ään kyseisen ympäristön tietokannan käyttäjätunnus ja salasana. Sen jälkeen voit ajaa kantaan migraatiot komennolla `pnpm run umzug up`.

Yhdistettyäsi yllä olevan ohjeen avulla migrate.ts:n kantaan, voit myös luoda uuden migraation komennolla `pnpm run umzug -- create --name "migraation-nimi.cjs"`.

### Testaus

Yksikkö- ja integrointi-testit on toteutettu Jest-kirjastolla. Ne voi ajaa komennolla `pnpm run test`. Testit ajetaan myös automaattisesti Github Actionsissa.

### Ajaminen lokaalisti

Sovellusta voi ajaa lokaalisti kolmella eri tavalla, ts. kolmea eri tietolähdettä vasten: 1. Staattisella testidatalla, 2. Lokaalia PostgreSql -kantaa vasten tai 3. Testiympäristön tietokantaa vasten SSH-tunnelin läpi.
Kaikissa kolmessa tapauksessa sovellusta ajetaan osoitteessa `http://localhost:3000`

#### Ajaminen staattista testidataa käyttäen

Käynnistä sovellus lokaalisti komennolla `pnpm run dev:local`. Tällöin sovellus lataa näytettävät lukemat tiedostoista `pulssi.json` ja `pulssi_old.json` hakemistosta `shared/testdata`.
Huom! Näytettävät lukemat ovat tässä tapauksessa aina samoja, ei sovellu tarkempaan historia-haun testaamiseen.

#### Ajaminen lokaalia PostgreSQl -kantaa vasten

Käynnistä ensin lokaali PostgreSql -kanta (kts. kaksi seuraavaa kappaletta).
Käynnistä tämän jälkeen sovellus lokaalisti komennolla `pnpm run dev:localdb`.

##### PostgreSQL Kontti-imagen luonti (tarvitsee tehdä vain kerran):

    cd postgresql
    docker build --tag tarjontapulssi-postgres .

##### Lokaalin tarjontapulssi-tietokannan käynnistys

Komento `pnpm run prepare-test-env` käynnistää lokaalin kannan, suorittaa migraatiot, sekä importoi kantaan valmiiksi testidataa. Kaikki vaiheet voi ajaa tarvittaessa myös erikseen, kts `package.json`. Tämän jälkeen kanta on valmiina käytettäväksi.
Huom! Datan importointi saattaa kestää useita kymmeniä sekunteja. Importointia ajettaessa päätteelle tulostuu toistuvasti `INSERT 0 1`.

#### Ajaminen testiympäristön tietokantaa vasten

Sovellusta voi ajaa lokaalisti testiympäristön (untuva tai hahtuva) tietokantaa vasten SSH-tunnelin läpi. VPN täytyy olla päällä.

Lisää ensin oman koneen `/etc/hosts` -tiedostoon rivi `127.0.0.1 tarjontapulssi.db.<ympäristö>opintopolku.fi`, jossa ympäristö on `untuva` tai `hahtuva`.
Tämän jälkeen tunnelin voi avata komennolla `ssh -N -L 5432:tarjontapulssi.db.hahtuvaopintopolku.fi:5432 <käyttäjätunnus>@bastion.<ympäristö>opintopolku.fi`, jossa käyttäjätunnus vastaa omaa käyttäjätunnusta ja ympäristö `untuva` tai `hahtuva`.

Käynnistä sovellus toisessa ikkunassa komennolla `pnpm run dev:localdb`. Kannan käyttäjätunnus ja salasana täytyy tällöin asettaa tiedostoon `app/servers/amount.localdb.server.ts`.

Huom! SST:n `sst dev` -tyylistä live-lambda -tilaa ei enää ole. Lambda-funktioiden muutokset testataan deployaamalla testiympäristöön.

##### Aws-vaultin ajaminen

Kun aws-vault on asennettu ja tarvittavat konfiguroinnit tehty (tarkemmat ohjeet alapuolella), voi sen käynnistää komennolla `aws-vault exec oph-dev`. Komento käynnistää uuden sub-shellin, jossa on asetettu tarvittavat sessio-kohtaiset ympäristömuuttujat.

Aws-vaultin asennukseen ja käyttöön löytyy ohjeet osoitteesta https://github.com/99designs/aws-vault.

Ennen sovelluksen ajamista täytyy käyttäjän `.aws/credentials` -tiedostosta löytyä määritys `[oph-federation]` ja sen alla käyttäjäkohtainen `aws_access_key_id` ja `aws_secret_access_key`. Tämän voi lisätä komennolla `aws-vault add oph-federation` tai vaihtoehtoisesti editoimalla tiedostoa manuaalisesti.

Lisäksi `.aws/config` -tiedostosta täytyy löytyä määritykset:

- `[profile oph-federation]` ja sen alla rivit `region = eu-west-1` ja `mfa_serial = arn:aws:iam::<käyttäjäkohtainen numero>:mfa/<käyttäjän email>`
- `[profile oph-dev]` ja sen alla rivit `region = eu-west-1`, `source_profile = oph-federation`, `mfa_serial = arn:aws:iam::<käyttäjäkohtainen numero>:mfa/<käyttäjän email>` ja `role_arn = arn:aws:iam::153563371259:role/CustomerCloudAdmin`

Esim.

    [profile oph-federation]
    region = eu-west-1
    mfa_serial = arn:aws:iam::123456789012:mfa/john.doe@company.com

    [profile oph-dev]
    region = eu-west-1
    source_profile = oph-federation
    mfa_serial = arn:aws:iam::123456789012:mfa/john.doe@company.com
    role_arn = arn:aws:iam::153563371259:role/CustomerCloudAdmin

Komennolla `aws-vault list` voi listata käytössä olevat profiilit. Listalta tulisi löytyä ainakin rivi:

    Profile                  Credentials              Sessions
    =======                  ===========              ========
    oph-federation           oph-federation           <sessio-lista>
