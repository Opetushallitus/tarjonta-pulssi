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

Function URL reitittää pyynnön Host-otsakkeen perusteella, joten CloudFront ei välitä katsojan Host-otsaketta, ja sovellus näkee osoitteenaan Function URL:n (`xxxx.lambda-url.<region>.on.aws`, ks. `server/functionUrlAdapter.ts`). Siksi sovellus ei käytä pyynnön hostia: Opintopolun osoite, johon otsakkeen linkki osoittaa, annetaan SSR-lambdalle `OPINTOPOLKU_URL`-ympäristömuuttujassa.

### Lokitus

| Mitä                                                    | Missä                                                                | Säilytys |
| ------------------------------------------------------- | -------------------------------------------------------------------- | -------- |
| SSR-lambdan access log                                  | CloudWatch Logs, `/tarjonta-pulssi/<ympäristö>/access`               | 2 vuotta |
| Lambdojen omat lokit (SSR, dbApi, updater, migraattori) | CloudWatch Logs, `/aws/lambda/<ympäristö>-tarjonta-pulssi-<funktio>` | 2 vuotta |
| CloudFront access log                                   | S3, stackin `accesslogbucket`-output, prefix `cloudfront/`           | 2 vuotta |

#### SSR-lambdan access log

Jokaisesta pyynnöstä kirjoitetaan yksi JSON-rivi omaan lokiryhmäänsä. Kenttien nimet
noudattavat muiden OPH-palveluiden access log -muotoa, ja arvot ovat merkkijonoja myös
numeroiden kohdalla:

```json
{
  "timestamp": "2026-10-02T12:55:29.678+0300",
  "responseCode": "200",
  "request": "GET /history?start=01.01.2026 HTTP/1.1",
  "responseTime": "28",
  "requestMethod": "GET",
  "service": "tarjonta-pulssi",
  "environment": "hahtuva",
  "customer": "OPH",
  "user-agent": "Mozilla/5.0 ...",
  "x-forwarded-for": "1.2.3.4, 194.136.110.100",
  "x-real-ip": "194.136.110.100",
  "remote-ip": "130.176.99.42",
  "response-size": "69988",
  "referer": "https://tarjonta-pulssi.hahtuvaopintopolku.fi/",
  "requestId": "cfdbf397-e863-454f-bb0c-64e27f163058"
}
```

`requestId` on lisä muiden palveluiden muotoon nähden. Sillä rivin saa yhdistettyä
SSR-lambdan omaan lokiryhmään, jonne virheet ja pinolistaukset menevät — sama arvo on myös
lokivirran nimessä, joka on molemmissa ryhmissä sama.

Rivejä syntyy vain HTML- ja data-pyynnöistä; staattiset assetit eivät kulje SSR-lambdan
kautta. Haku Logs Insightsilla:

```
fields @timestamp, `x-real-ip`, request, responseCode, responseTime
| sort @timestamp desc
```

Kolme asiaa, joiden varassa tämä on:

- **Rivi kirjoitetaan PutLogEvents-rajapinnalla, ei `console.log`illa.** Lambda ohjaa
  stdoutin aina funktion omaan lokiryhmään ja lisää riville `timestamp requestId INFO`
  -etuliitteen, jolloin tulos ei ole jäsennettävää JSONia. Hinta on yksi API-kutsu
  pyyntöä kohden. Se ei kuitenkaan näy katsojalle: Function URL striimaa vastaukset
  (`InvokeMode.RESPONSE_STREAM`), ja rivi kirjoitetaan vasta kun vastausstream on
  suljettu. Lambda jäädyttää suoritusympäristön vasta käsittelijän palattua, joten
  kirjoitus ehtii valmiiksi. Epäonnistunut lokitus ei kaada pyyntöä, vaan kirjataan
  `console.error`illa.
- **`x-real-ip` luetaan `X-Forwarded-For` -ketjun viimeisestä alkiosta**, ei
  `requestContext.http.sourceIp`:stä — jälkimmäinen on CloudFrontin reunapalvelin ja
  löytyy kentästä `remote-ip`. CloudFront lisää katsojan IP:n ketjun loppuun, joten vain
  viimeinen alkio on sellainen, jota selain ei voi väärentää.
- **User-agent on oikea vain origin request policyn ansiosta.** Jos
  `ALL_VIEWER_EXCEPT_HOST_HEADER` joskus vaihdetaan, CloudFront korvaa otsakkeen arvolla
  `Amazon CloudFront` — mikä rikkoisi myös `isbot`-tunnistuksen `entry.server.tsx`:ssä.

#### CloudFront access log

Kattaa **kaikki** selainpyynnöt — myös staattiset assetit ja välimuistiosumat, jotka eivät
koskaan päädy SSR-lambdalle. Muoto on gzipattu W3C-tabulaattorieroteltu tiedosto, toimitus
tunneittain ja best-effort-periaatteella, eli yksittäinen rivi voi saapua viiveellä tai jäädä
kokonaan pois.

##### Kysely Athenalla

Stack luo Glue-tietokannan ja -taulun sekä Athena-työryhmän, joten lokit ovat kyselykelpoisia
ilman käsityötä. Nimet löytyvät stackin outputeista `athenadatabase` ja `athenaworkgroup`.

Valitse Athena-konsolissa työryhmäksi `tarjonta-pulssi-<ympäristö>` — se määrää kyselytulosten
sijainnin, eikä sitä voi ohittaa. Tulokset kirjoitetaan lokiämpärin prefiksin
`athena-results/` alle ja siivotaan 7 vuorokaudessa.

```sql
SELECT "date", time, request_ip, uri, status, time_taken
FROM tarjonta_pulssi_hahtuva.cloudfront_access_logs
WHERE status >= 400
ORDER BY "date" DESC, time DESC
LIMIT 100;
```

Sarakenimet ovat samat kuin AWS:n dokumentaation valmiissa CloudFront-DDL:ssä, joten sieltä
kopioidut esimerkkikyselyt toimivat sellaisenaan. Huom. että **`date` on Athenassa varattu
sana** ja vaatii lainausmerkit tai backtickit.

**Kyselyt lukevat koko lokiprefiksin.** Legacy-lokit eivät ole partitioituja — päivämäärä on
tiedostonimessä eikä hakemistopolussa, ja Athenan partitiot ovat hakemistopohjaisia. Tämän
palvelun liikennemäärällä se ei ole ongelma: skannattava määrä jää pitkäksi aikaa Athenan 10 MB
minimiveloituksen alle. Jos liikenne joskus kasvaa merkittävästi, ratkaisu on siirtyä standard
logging v2:een, joka osaa kirjoittaa Hive-yhteensopivan `year=/month=/day=` -rakenteen ja
Parquetin — se vaatisi kolmannen stackin us-east-1:een, ks. kommentti `stacks/tarjonta-pulssi.ts`:ssä.

#### Tietosuoja

Sekä CloudFrontin access log että SSR-lambdan access log **sisältävät asiakkaan
IP-osoitteen**. Säilytysaika on kaikilla lokeilla kaksi vuotta — se on tietosuojapäätös, ei
tekninen, ja se on tehty tietoisesti. Arvo on vakiossa `LOG_RETENTION` tiedostossa
`stacks/tarjonta-pulssi.ts`; S3:n lifecycle-sääntö johtaa oman arvonsa siitä. Evästeitä ei
lokiteta kummassakaan.

Tuotannossa (`sade`) lokiämpäri ja lokiryhmät säilyvät vaikka stack poistettaisiin;
testiympäristöissä ne siivotaan stackin mukana. Kiinteät nimet tarkoittavat nimittäin, ettei
ryhmää voi luoda uudelleen jos samanniminen on jo olemassa.

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
