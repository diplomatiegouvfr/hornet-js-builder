# Montée de version vers 1.6.2

## Url pour installation des binaires

Dans notre contexte, la majeur partie du temps cela concerne Sqlite.

La surcharge du host pour le téléchargement des binaires passe par de la configuration NPM dans le fichier npmrc ( https://docs.npmjs.com/files/npmrc ), exemple :

`node_sqlite3_binary_host_mirror=http://artifactory.app.diplomatie.gouv.fr/artifactory-dev/repository-npm-tiers`

permet de récupérer les binaires sqlite3 depuis http://artifactory.app.diplomatie.gouv.fr/artifactory-dev/repository-npm-tiers

Il est possible d'utiliser une variable d'environnement pour obtenir le même résultat :

```
EXPORT npm_config_node_sqlite3_binary_host_mirror=http://artifactory.app.diplomatie.gouv.fr/artifactory-dev/repository-npm-tiers
```