# Tarjonta-pulssi

Tarjonta-pulssi on palvelu, joka koostaa koulutustarjontaan (kouta/konfo) liittyviä tunnuslukuja ja esittää niitä.

## Arkkitehtuuri

Palvelu koostuu karkeasti kuvattuna kolmesta AWS-lambdasta, PostgreSQL-tietokannasta ja yhdestä S3-ämpäristä. 
Ensimmäinen lambda-funktio (updater) hakee lukumääriä ElasticSearch:ista ja tallentaa niitä palvelun omaan PostgreSQL-tietokantaan. Tämän jälkeen lambda-funktio käynnistää toisen lambda-funktion (publisher).
Toinen lambda-funktio (publisher) hakee luvut tietokannasta ja muotoilee ne sopivaan JSON-formaattiin, joka tallennetaan s3-ämpäriin nimellä `pulssi.json`. JSON-tiedoston lisäksi s3-ämpäriin tallennetaan palvelun deployn yhteydessä front-end-sovelluksen tiedostot (app-hakemisto).
Kolmas lambda-funktio on tietokantamigraatioiden ajamista varten ja suoritetaan deployn yhteydessä.

## CDK, lambdat ja tietokantamigraatiot

Cdk-hakemistosta löytyy AWS:n CDK-kirjastolla toteutetut infran määrittelytiedostot, sekä lambda-funktioiden lähdekoodit. 

### Esivaatimukset

* aws-profiilit ovat käyttäjän kotihakemistossa `cloud-base` - repositorystä löytyvän `tools/config-wizard.sh` mukaiset.
* npm ja npx - asennettuina
* [AWS cli](https://aws.amazon.com/cli/) ElasticSearch -kontti-imagen latausta varten. Tätä tarvitaan ainoastaan testidataa päivitettäessä.#
* [Docker](https://www.docker.com/get-started) ElasticSearchia ja PostgreSQLää varten. Tätä tarvitaan ainoastaan testidataa päivitettäessä.

### Lambdojen buildaus ja deploy

* `./deploy.sh build`   			pelkästään buildaa Lambdojen TypeScriptit ja CDK templatet
* `./deploy.sh ympäristö deploy`   	buildaa kuten yllä sekä deployaa kohdeympäristöön
* `-d`   	                        Asentaa tarvittavat NPM - kirjastot (npm ci)
### Sovelluksen rakentaminen tyhjästä AWS:ään
#### Tietokanta (cloud-base repositoryssä)
##### Luo tietokannan luontia varten tarvittavat salaisuudet (älä sisällytä merkkejä  / , ` , @ )

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

#### Deployaa tarjonta-pulssi sovellus (tarjonta-pulssi repositoryssä)
`./deploy.sh ymparisto deploy -d`

### Tietokantamigraatiot

Tietokantamigraatiot on toteutettu [Umzug](https://github.com/sequelize/umzug)-kirjastolla ja ne löytyvät hakemistosta cdk/db/migrations. Migraatiot ajetaan lambdassa automaattisesti deployn yhteydessä ja ne on toteutettu JavaScript CommonJS-moduuleina, jotta niitä on helpompi ajaa lambdassa. 

Migraatiot voi ajaa myös käsin. Jos haluat ajaa migraatioita käsin esim. untuvaa vasten, aseta ensin VPN päälle ja tunneloi haluamasi ympäristön tietokantayhteys localhostiin. Lisää migrate.ts:ään kyseisen ympäristön tietokannan käyttäjätunnus ja salasana. Sen jälkeen voit ajaa kantaan migraatiot komennolla `npm run umzug up`. 

Yhdistettyäsi yllä olevan ohjeen avulla migrate.ts:n kantaan, voit myös luoda uuden migraation komennolla `npm run umzug -- create --name "migraation-nimi.js"`. 

### Testaus

Yksikkö- ja integrointi-testit on toteutettu Jest-kirjastolla. Ne voi ajaa komennolla `npm run test`. Testit ajetaan myös automaattisesti Github Actionsissa.

#### Testidatan päivitys

Testidata viittaa tässä `cdk/test/resources/pulssi.json` -tiedostoon, joka sisältää tarjonta-pulssin lambda-funktioilla lokaalisti tuotettua dataa.

##### PostgreSQL Kontti-imagen luonti (tarvitsee tehdä vain kerran):
`cd postgresql`
`docker build --tag tarjontapulssi-postgres`

##### Lokaalin tarjontapulssi-tietokannan käynnistys
`npm run database`

##### Lokaalin Elasticsearchin käynnistys

Ellei Elasticsearchia ole aiemmin ajettu Docker-kontissa käyttäjän koneella, ladataan kontti-image automaattisesti ensimmäisellä käynnistyskerralla (Tehdään siis ainoastaan kerran).
Ennen käynnistystä ajetaan komento:
`aws ecr get-login-password --region eu-west-1 --profile oph-utility | docker login --username AWS --password-stdin 190073735177.dkr.ecr.eu-west-1.amazonaws.com`

Elasticsearch käynnistetään komennolla:
`docker run -d --rm --name kouta-elastic --env "discovery.type=single-node" -p 127.0.0.1:9200:9200 -p 127.0.0.1:9300:9300 -e xpack.security.enabled=false 190073735177.dkr.ecr.eu-west-1.amazonaws.com/utility/elasticsearch-kouta:8.5.2`

##### Elasticsearch-dumppien kopiointi

Tarjontapulssin testidata generoidaan kouta-indeksoijan tuottamien Elasticsearch-dumppien perusteella. (kts. kouta-indeksoija README, Mock-datan generointi).
Päivitetyt dump-tiedostot kopioidaan kouta-indeksoijan `elasticdump/tarjonta-pulssi` -hakemistosta tarjonta-pulssin `cdk/test/resources/elasticdump` -hakemistoon.

##### Elasticsearch-dumppien lataaminen lokaaliin Elasticsearchiin
`npm run elasticdump`


##### Lambda-funktioiden ajaminen lokaalisti
`npm run preparetest`

## Front-end sovellus

Tarjonta-pulssin tietojen esittämistä varten on toteutettu yhden sivun sovellus (SPA), jonka tiedostot löytyvät hakemistosta app. Kehitystyökaluna on käytetty [Viteä](https://vitejs.dev/) ja UI-kirjastona [Preactia](https://preactjs.com/).

### Ajaminen lokaalisti

Sovelluksen voi käynnistää lokaalisti komennolla `npm run dev`. Erotuksena tuotanto-versioon tällöin ladataan `pulssi.json`-tiedosto test_data-hakemistosta, eikä juuresta.