# Tarjonta-pulssi

## Esivaatimukset

* aws-profiilit ovat käyttäjän kotihakemistossa `cloud-base` - repositorystä löytyvän `tools/config-wizard.sh` mukaiset.
* npm ja npx - asennettuina

## Lambdan buildaus ja deploy

* `./deploy.sh build`   			pelkästään buildaa Lambdan TypeScriptit ja CDK templatet
* `./deploy.sh ympäristö deploy`   	buildaa kuten yllä sekä deployaa kohdeympäristöön
* `-d`   	                        Asentaa tarvittavat NPM - kirjastot (npm ci)
