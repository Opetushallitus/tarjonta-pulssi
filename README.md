# Tarjonta-pulssi

Tarjonta-pulssi on palvelu, joka koostaa koulutustarjontaan (kouta/konfo) liittyviä tunnuslukuja ja esittää niitä.

## Arkkitehtuuri

Palvelu on rakennettu [SST](https://docs.sst.dev/) ja [Remix](https://remix.run/) -framework:eja käyttäen. Palvelu koostuu karkeasti kuvattuna Remix-site -constructista, kolmesta erillisestä AWS-lambdasta ja PostgreSQL-tietokannasta.
Remix-site koostaa varsinaisen Tarjonta-pulssi web-sovelluksen AWS:n sisällä: Tallentaa sovelluksen staattiset tiedostot S3 -ämpäriin, josta ne tarjoillaan käyttäjälle CloudFront:in (CDN) kautta. Sisältää myös
sovelluksen Remix NodeJS Lambda-backendin.
Ensimmäinen lambda-funktio (updater) hakee lukumääriä ElasticSearch:ista ja tallentaa niitä palvelun omaan PostgreSQL-tietokantaan. Toinen lambda / API (dbApi) tarjoaa sovellukselle rajapinnan datan hakemiseen tietokannasta.
Kolmas lambda-funktio on tietokantamigraatioiden ajamista varten ja suoritetaan deployn yhteydessä.

Tietojen esittämistä varten on toteutettu yhden sivun (SPA) sovellus, Remix -framework:in päälle. UI -kirjastona on käytetty [Reactia](https://react.dev/). Sovelluksessa käytetään [MUI](https://mui.com/) -kirjaston tarjoamia käyttöliittymäkomponentteja.

## Hakemistorakenne

- Sovelluksen infran määrittelytiedosto `tarjonta-pulssi.ts` löytyy hakemistosta `sst-app/stacks`. Määrittelyt (constructit) on toteutettu AWS CDK:lla.
- Lambda-funktioden lähdekoodit löytyvät hakemistosta `sst-app/packages/functions/src`.
- Web (Remix) -sovelluksen koodit löytyvät hakemistosta `sst-app/packages/web`.
- Yhteiset, sekä lamdoissa että web-sovelluksessa käytettävät koodit löytyvät hakemistosta `sst-app/packages/shared`.
- Tietokantamigraatiot löytyvät hakemistosta `sst-app/packages/shared/db/migrations`.

### Esivaatimukset

- aws-profiilit ovat käyttäjän kotihakemistossa `cloud-base` - repositorystä löytyvän `tools/config-wizard.sh` mukaiset.
- npm ja npx asennettuina, versio 9.8.1 tai uudempi
- node asennettuna, versio 18.x
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

#### Deployaa tarjonta-pulssi sovellus (tarjonta-pulssi -repositoryssä, sst-app -hakemistossa)

`npx sst deploy --profile=<oph-dev / oph-prod> --stage=<ympäristö>`

Ympäristö on joko `untuva`, `hahtuva`, `pallero` tai `sade` (= tuotanto)
Profiili on sade / tuotanto -ympäristössä `oph-prod`, muissa `oph-dev`

Komennon ajamisesta tehty seuraavia huomioita (ajettu macOS:ssä).

- Postgresql:n `pg_config` -työkalu täytyy löytyä polusta. Työkalun voi kopioida PostgreSQL -kontin sisältä (kontin käynnistämiseksi kts. Ajaminen lokaalia PostgreSQL -kantaa vasten) komennolla `docker cp tarjontapulssi-database:/usr/bin/pg_config <kohdehakemisto>`. Vaihtoehtoinen tapa on asentaa PostgreSQL omalle koneelle.
- `xcrun` -työkalu täytyy olla asennettuna ja oikein konfiguroituna. Tämä onnistuu komennolla `xcode-select --install`.

### Tietokantamigraatiot

Tietokantamigraatiot on toteutettu [Umzug](https://github.com/sequelize/umzug)-kirjastolla ja ne löytyvät hakemistosta `sst-app/packages/shared/db/migrations`. Migraatiot ajetaan lambdassa automaattisesti deployn yhteydessä ja ne on toteutettu JavaScript CommonJS-moduuleina, jotta niitä on helpompi ajaa lambdassa.

Migraatiot voi ajaa myös käsin. Jos haluat ajaa migraatioita käsin esim. untuvaa vasten, aseta ensin VPN päälle ja tunneloi haluamasi ympäristön tietokantayhteys localhostiin. Lisää migrate.ts:ään kyseisen ympäristön tietokannan käyttäjätunnus ja salasana. Sen jälkeen voit ajaa kantaan migraatiot komennolla `npm run umzug up`.

Yhdistettyäsi yllä olevan ohjeen avulla migrate.ts:n kantaan, voit myös luoda uuden migraation komennolla `npm run umzug -- create --name "migraation-nimi.cjs"`.

### Testaus

Yksikkö- ja integrointi-testit on toteutettu Jest-kirjastolla. Ne voi ajaa komennolla `npm run test`. Testit ajetaan myös automaattisesti Github Actionsissa.

### Ajaminen lokaalisti

Sovellusta voi ajaa lokaalisti kolmella eri tavalla, ts. kolmea eri tietolähdettä vasten: 1. Staattisella testidatalla, 2. Lokaalia PostgreSql -kantaa vasten tai 3. Live-lambda -moodissa testiympäristöä vasten.
Kaikissa kolmessa tapauksessa sovellusta ajetaan osoitteessa `http://localhost:3000`

#### Ajaminen staattista testidataa käyttäen

Käynnistä sovellus lokaalisti komennolla `npm run dev:local` hakemistossa `sst-app/packages/web.` Tällöin sovellus lataa näytettävät lukemat tiedostoista `pulssi.json` ja `pulssi_old.json` hakemistosta `sst-app/packages/shared/testdata`.
Huom! Näytettävät lukemat ovat tässä tapauksessa aina samoja, ei sovellu tarkempaan historia-haun testaamiseen.

#### Ajaminen lokaalia PostgreSQl -kantaa vasten

Käynnistä ensin lokaali PostgreSql -kanta (kts. kaksi seuraavaa kappaletta).
Käynnistä tämän jälkeen sovellus lokaalisti komennolla `npm run dev:localdb` hakemistossa `sst-app/packages/web.`

##### PostgreSQL Kontti-imagen luonti (tarvitsee tehdä vain kerran):

    cd postgresql
    docker build --tag tarjontapulssi-postgres .

##### Lokaalin tarjontapulssi-tietokannan käynnistys

Komento `npm run prepare-test-env` (hakemistossa `sst-app`) käynnistää lokaalin kannan, suorittaa migraatiot, sekä importoi kantaan valmiiksi testidataa. Kaikki vaiheet voi ajaa tarvittaessa myös erikseen, kts `sst-app/package.json`. Tämän jälkeen kanta on valmiina käytettäväksi.
Huom! Datan importointi saattaa kestää useita kymmeniä sekunteja. Importointia ajettaessa päätteelle tulostuu toistuvasti `INSERT 0 1`.

#### Ajaminen live-lambda moodissa

Live-lambda tilassa sovellusta ajetaan testiympäristöä (untuva tai hahtuva) vasten niin että Web-sovellusta (Remix) sekä Lambda-funktioita ajetaan lokaalisti.
Huom! tässä tapauksessa ko. testiympäristöä ajetaan dev -moodissa, eikä sovellusta voi käyttää testiympäristössä normaaliin tapaan.

Ajaminen vaatii SSH -tunnelin ymäristön tietokantaan bastionin läpi. Myös VPN täytyy olla päällä.
Lisää ensin oman koneen `/etc/hosts` -tiedostoon rivi `127.0.0.1 tarjontapulssi.db.<ympäristö>opintopolku.fi`, jossa ympäristö on `untuva` tai `hahtuva`.
Tämän jälkeen tunnelin voi avata komennolla `ssh -N -L 5432:tarjontapulssi.db.hahtuvaopintopolku.fi:5432 <käyttäjätunnus>@bastion.<ympäristö>opintopolku.fi`, jossa käyttäjätunnus vastaa omaa käyttäjätunnusta ja ympäristö `untuva` tai `hahtuva`.

Suositeltava tapa on käyttää kahta terminaali-ikkunaa käyttäen siten että toisessa ajetaan Live lambda -kehitysympäristöä ja toisessa Remix -sovellusta. Ainakin Remix -ikkunassa on suositeltavaa käynnistää ensin `aws-vault` -sessio, jolloin MFA -koodi tarvitsee syöttää ainoastaan kerran (muussa tapauksessa koodin syöttämistä vaaditaan säännöllisin väliajoin).
Käynnistä ensin kehitysympäristö toisessa ikkunassa komennolla `npx sst dev --profile=oph-dev --stage=<ympäristö>` (hakemistossa `sst-app`), jossa ympäristö `untuva` tai `hahtuva`.
Tämän jälkeen käynnistä Remix-sovellus toisessa ikkunassa komennolla `npm run dev` (hakemistossa `sst-app/packages/web`).

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
