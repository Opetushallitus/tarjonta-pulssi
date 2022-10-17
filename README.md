# Tarjonta-pulssi

## Esivaatimukset

* aws-profiilit ovat käyttäjän kotihakemistossa `cloud-base` - repositorystä löytyvän `tools/config-wizard.sh` mukaiset.
* npm ja npx - asennettuina

## Lambdan buildaus ja deploy

* `./deploy.sh build`   			pelkästään buildaa Lambdan TypeScriptit ja CDK templatet
* `./deploy.sh ympäristö deploy`   	buildaa kuten yllä sekä deployaa kohdeympäristöön
* `-d`   	                        Asentaa tarvittavat NPM - kirjastot (npm ci)

## Sovelluksen rakentaminen tyhjästä AWS:ään
### Tietokanta (cloud-base repositoryssä)
#### Luo tietokannan luontia varten tarvittavat salaisuudet (älä sisällytä merkkejä  / , ` , @ )

`aws/config.py ymparisto put-secret -k postgresqls/tarjontapulssi/master-user-password`  
`aws/config.py ymparisto put-secret -k postgresqls/tarjontapulssi/app-user-password`  
`aws/config.py ymparisto put-secret -k postgresqls/tarjontapulssi/readonly-user-password`
`aws/config.py ymparisto put-secret -k postgresqls/tarjontapulssi/app-user-name`  
`aws/config.py ymparisto put-secret -k postgresqls/tarjontapulssi/readonly-user-name`

#### Lisää tietokanta stacks.json:iin (tarvitsee tehdä vain kerran ja toimii kaikkien ympäristöjen kanssa)
`vim aws/templates/stacks.json`

#### Lisää tietokanta environment.json:iin
`vim aws/environments/ymparisto/environment.json`

#### Luo tietokanta
`aws/cloudformation.py ymparisto postgresqls create -s tarjontapulssi`

#### Luo tietokantakäyttäjät
`cd tools/db`
`./update-postgres-db-roles.sh ymparisto tarjontapulssi`

## Deployaa tarjonta-pulssi sovellus (tarjonta-pulssi repositoryssä)
`./deploy.sh ymparisto deploy`
