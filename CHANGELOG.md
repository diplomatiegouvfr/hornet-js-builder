# Hornet JS Builder 2.1.0

-   feat: builder.js become .builder.js
-   feat: bump through2 to 4.0.2 and add execa 5.1.1
-   feat: update nodemon 2.0.12
-   feat: update typescript 4.4.2
-   feat: ajout de la transpilation des externals modules
-   feat: updates deps gulp-jslint, webpack-bundle-analyzer
-   feat: add repository
-   feat: maj DOC
-   feat: utilisation de param TsFile pour eslint
-   feat: add doc ENOSPC sur watcher
-   feat: ajout plugins pour anciennes versions de la filière (5.0)
-   feat: prepare publish
-   feat: exclusion repertoire pour la publication
-   feat: update deps gulp
-   feat: génération des index.dts avec prise en charge du main (package.json)
-   feat: ajout tilde pour import sass
-   feat: migration gulp4 (ajout cwd)
-   feat: ajout tache renvoyant la liste des sous modules d'un parent
-   feat: mode silent pour exploiter le résultat de la console
-   feat: update deps

-   docs: ajout doc option -e
-   docs: add TOC

-   proj : move ci common
-   proj : log
-   proj : quality
-   proj : qualité (sonar)
-   proj : mise en place des build artifactory

-   fix : run mocha on test:run
-   fix : postcss-loader broke semver
-   fix : entry no outdir, use option
-   fix : suppression config webpack css pour conflit avec config sass qui gère aussi les fichiers css
-   fix : mocha non compatible node8
-   fix : exclusion tsx dans le package des applications
-   fix : before/after task suite update gulp
-   fix : prepare-publish conf
-   fix : prepare publish exclude files
-   fix : correction des chemeins des sources en cas de parent sur le merge

-   build : modification du répertoire de publication
-   build : common CI
-   build : suppression deps inutiles

-   refactor : suppression des tâches de lint au profit du module eslint-config-hornet
-   refacfor: del authorizedPrerelease

# Hornet JS Builder 2.0.7

-   EVOL : génération des index.d.ts pour les applications
-   EVOL : pour la rétro compatibilité nodejs pour le watch serveur(options différentes entre 8 et 10)

# Hornet JS Builder 2.0.6

-   fix watch sur les applications type serveur
-   correction du prepend pour les exclusion (négation !)
-   copie des ressources autres que sources pour les tests
-   recopie des node_modules à chaque installation en lien
-   gulpDelete ajout cwd
-   correction de chemin pour installation window
-   Fix #1, ajout raccourci install

# Hornet JS Builder 2.0.5

-   ajout tache update de version des dépendances
-   ne pas stopper la watch compilation si erreur
-   déclaration de tache commune app / module
-   ajout de message si aucune couverture de test à merger (aucun TU)
-   mutualisation config istanbul (mocha / karma)
-   modification npmignore pour publication
-   update version istanbul => nyc
-   Suppression de la surcharge 'resolveLookupPaths' pour un comportement plus natif
-   Ajout RemainingArgs sur le publish (permet d'ajouter un tag par exemple)
-   Utilisation de la configuration src et test pour copier les ressources si outdir dans la configuration typescript est précisé
-   Ajout d'une tache pour ajouter des entêtes aux fichiers sources
-   Ajout tips sur postinstall
-   Update des versions des dépendances
-   Correction configuration externals (problème de merge) pour karma
-   Suppression ignore des fichiers (js,...) si outdir dans la configuration typescript
-   La tache watch = watch:client pour les types composants
-   Renommage test:karma:run => test:karma:exe
-   Stop les taches si publish est en erreur
-   Ajout nodemon cwd avec outdir dans la configuration typescript
-   Ajout tache karma:exe
-   Correction de la configuration webpack pour génération dll suite à l'externalisation de la configuration
-   Génération index.dts et réécriture import pour les tests karma
-   Ajout devserver pour les types module
-   Stop sur erreur lors de la publication, installation et compilation (hors watch)
-   Isolation des modules pour les chunk prod
-   Configuration de mocha avec activation preserve-symlinks (externals)
-   Suppression de la tache "dependencies:install-ci-prod" sur la publication autre que application
-   Ajout du plugin Karma : karma selenium launcher
-   Ajout délai pour regénaration des chunk test karma
-   Ajout var env HB_WATCH_DELAY et modification de la valeur par défaut (attention c'est en ms)
-   Meilleur message d'erreur si tache/sous-tache incompatible avec type de projet

## Bump version

| Package                       |  Old   |    New |
| ----------------------------- | :----: | -----: |
| ansi-colors                   | 3.2.4  |  4.1.1 |
| chalk                         | 2.4.2  |  3.0.0 |
| css-loader                    | 2.1.1  |  3.4.0 |
| dargs                         | 6.1.0  |  7.0.0 |
| del                           | 4.1.1  |  5.1.0 |
| express                       | 4.16.4 | 4.17.1 |
| file-loader                   | 3.0.1  |  5.0.2 |
| fs-extra                      | 8.0.1  |  8.1.0 |
| glob                          | 7.1.4  |  7.1.6 |
| karma                         | 4.1.0  |  4.4.1 |
| karma-chrome-launcher         | 2.0.0  |  3.1.0 |
| karma-coverage                | 1.1.2  |  2.0.1 |
| karma-firefox-launcher        | 1.1.0  |  1.2.0 |
| karma-junit-reporter          | 1.2.0  |  2.0.1 |
| karma-sonarqube-unit-reporter | 0.0.18 | 0.0.21 |
| karma-webpack                 | 3.0.5  |  4.0.2 |
| lnk                           | 0.4.4  |  1.1.0 |
| loader-utils                  | 0.2.15 |  1.2.3 |
| map-stream                    | 0.0.6  |  0.0.7 |
| mini-css-extract-plugin       | 0.5.0  |  0.9.0 |
| mocha                         | 6.1.4  |  7.0.0 |
| nodemon                       | 1.18.9 |  2.0.2 |
| object-hash                   | 1.1.4  |  2.0.1 |
| p-queue                       | 3.0.0  |  6.2.1 |
| pretty-hrtime                 | 1.0.2  |  1.0.3 |
| requirejs                     | 2.3.3  |  2.3.6 |
| resolve-url-loader            | 3.0.0  |  3.1.1 |
| rimraf                        | 2.5.4  |  3.0.0 |
| semver                        | 5.3.0  |  7.1.1 |
| serve-static                  | 1.13.2 | 1.14.1 |
| shelljs                       | 0.8.2  |  0.8.3 |
| source-map-loader             | 0.2.3  |  0.2.4 |
| streamqueue                   | 0.1.3  |  1.1.2 |
| style-loader                  | 0.16.1 |  1.0.2 |
| terser-webpack-plugin         | 1.3.0  |  2.3.1 |
| tslint                        | 5.16.0 | 5.20.1 |
| tslint-config-airbnb          | 5.9.2  | 5.11.2 |
| typescript                    | 3.4.5  |  3.7.3 |
| url-loader                    | 1.1.2  |  3.0.0 |
| webpack                       | 4.31.0 | 4.41.4 |
| webpack-bundle-analyzer       | 3.3.2  |  3.6.0 |
| webpack-merge                 | 4.2.1  |  4.2.2 |
| which                         | 1.3.1  |  2.0.2 |

# Hornet JS Builder 2.0.4

-   Ajout d'une tache watch:client pour compile typescript + génération de la partie client
-   Ajout d'une tache watch pour install, compile et activation des watch et watch:run pour compile et activation des watch
-   Ajout de la possibilité de mettre la configuration dans un fichier js

# Hornet JS Builder 2.0.3

-   Ajout var env HB_WATCH_DELAY et modification de la valeur par défaut (attention c'est en ms)
-   Fix "watch:client:run" ne lance plus le watch:ts
-   Ajout doc RemainingArgs
-   Fix erreur ejs rename file
-   Correction calcul des RC précis pour une verison
-   Correction doc builder

# Hornet JS Builder 2.0.1

-   Déplacement de 'npm ci' après le packaging webpack.
-   passage en lodash (4.17.11) modules :
    -   lodash.clonedeep: 4.5.0",
    -   lodash.endswith: 4.2.1",
    -   lodash.filter: 4.6.0",
    -   lodash.find: 4.6.0",
    -   lodash.flatten: 4.4.0",
    -   lodash.foreach: 4.5.0",
    -   lodash.groupby: 4.6.0",
    -   lodash.isempty: 4.4.0",
    -   lodash.isfunction: 3.0.9",
    -   lodash.isobject: 3.0.2",
    -   lodash.isnan: 3.0.2",
    -   lodash.isnumber: 3.0.3",
    -   lodash.isundefined: 3.0.1",
    -   lodash.map: 4.6.0",
    -   lodash.merge: 4.6.2",
    -   lodash.sortby: 4.7.0",
    -   lodash.uniq: 4.5.0",

# Hornet JS Builder 2.0.0

-   EVOL : Suppression des clés appDependencies, buildDependencies et testDependencies: désormais, il faut utiliser la norme npm; dependencies, devDependencies etc. Utilisation aussi de la librairie npm installée et non celle tiré par le builder
-   EVOL : Suppression du theme et prise en charge de sass
-   EVOL : Ajout nouvelle tâches effectuant une action précise. Exemple: la tâche compile fait d'abord l'install avant de faire la transpilation. La nouvelle tâche compile:run suppose que l'install est déjà faite et ne le fait donc pas.
-   EVOL : Simplification pour la possibilité d'ajouter de la conf webpack dans un projet
-   EVOL : Simplification pour la possibilité d'ajouter de la conf karma dans un projet
-   EVOL : Montée de version des librairies:
    -   commander : 2.9.0 -> 2.20.0
    -   css-loader : 0.28.0 -> 2.1.1
    -   del : 2.2.2 -> 4.1.1
    -   event-stream : 3.3.4 -> 4.0.1
    -   express : 4.14.0 -> 4.16.4
    -   file-loader : 0.11.1 -> 3.0.1
    -   fs-extra : 2.0.0 -> 8.0.1
    -   glob : 7.1.2 -> 7.1.4
    -   gulp-concat : 2.6.0 -> 2.6.1
    -   gulp-ej : 3.0.1 -> 4.0.0
    -   gulp-eol : 0.1.2 -> 0.2.0
    -   gulp-header : 1.8.9 -> 2.0.7
    -   gulp-istanbul : 1.1.0 -> 1.1.3
    -   gulp-nodemon : 2.1.0 -> 2.4.2
    -   gulp-replace : 0.6.1 -> 1.0.0
    -   gulp-sourcemaps : 1.6.0 -> 2.6.5
    -   gulp-token-replace : 1.1.2 -> 1.1.5
    -   gulp-tslint : 8.1.2 -> 8.1.4
    -   gulp-typescript : 3.1.4 -> 5.0.1
    -   gulp-zip : 3.2.0 -> 4.2.0
    -   karma : 3.1.1 -> 4.1.0
    -   karma-coverage: 1.1.1 -> 1.1.2
    -   karma-firefox-launcher : 1.0.1 -> 1.1.0
    -   karma-mocha-reporter : 2.2.3 -> 2.2.5
    -   lodash : 4.13.1 -> 4.17.11
    -   nodemon : 1.11.0 -> 1.18.0
    -   through2 : 0.6.5 -> 3.0.1
    -   tslint : 5.11.0 -> 5.16.0
    -   typescript : 3.0.3 -> 3.4.5
    -   uglifycss : 0.0.27 -> 0.0.29
    -   url-loader : 0.5.8 -> 1.1.2
    -   vinyl-fs : 2.4.3 -> 3.0.3
    -   webpack : 3.10.0 -> 4.31.0
    -   webpack-bundle-analyzer : 2.9.2 -> 3.3.2
    -   webpack-merge : 4.1.1 -> 4.2.1
    -   webpack-stream : 4.0.0 -> 5.2.1
    -   yamljs : 0.2.8 -> 0.3.0

# Hornet JS Builder 1.6.0

-   EVOL : mode interactive
-   EVOL : support du mode sql
-   EVOL : SASS
-   FIX : Correction enchainement test karma et mocha

# Hornet JS Builder 1.5.4

-   update rules et dépendances tslint, airbnb

# Hornet JS Builder 1.5.3

-   Activation des externals modules depuis le parent.
-   Maj Gulp-zip 4.1.0
-   Maj documentation task clean
-   webpack v3.10.0
-   webpack-merge 4.1.1
-   webpack-stream 4.0.0
-   update dll vendor
-   paramètre --noWarn
-   Ajout tâche de recherche de dernière version d'un module.
-   Ajout tâche de merge de rapport de test (mocha / karma)
-   Validation des templates json environment
-   Zip des scripts database
-   Ajout de l'option stopOnError, qui stoppe l'ensemble des tâches si une erreur dans les tests Mocha est
-   Ajout de la génération des rapports JUnit
-   Ajout de la génération de 'index.d.ts' pour les modules
-   typecript 2.7.2

# Hornet JS Builder 1.5.2

-   Filter sur prepare package spa
-   Tolérance à la compilation webpack sur karma
-   Correction sur le chargement du default uniquement sur type application
-   Amélioration des clean et fix @types
-   Maj Chalk
-   Clean du theme
-   MAJ Clé sonar
-   Dependency:set fix les versions de dépendance
-   Ajout d'un message d'erreur sur argument non présent en fix version
-   Création tâche CommunityThemeInclusion

# Hornet JS Builder 1.5.1

-   Correction de l'installation de dépendances sujettes au scope
-   Ajout tache de merge de rapport de test (mocha / karma)
-   Evol pour perfs installation des dépendances de test

# Hornet JS Builder 1.5.0

-   Correction pre et post tache depuis un parent
-   Typescript 2.5 et prise en compte du tsconfig.json pour les sources de compilation
-   Dependance externes et parent pour les tests
-   Ajout tache analyse webpack

# Hornet JS Builder 1.4.2

-   Externalisation template KarmaJs
-   Ajout gestion dll webpack
-   Ajout install specifique

# Hornet JS Builder 1.4.1

-   Ajout tache de versionning
-   Ajout tache template
-   Ajout type application-server
-   fixe problème resolver avec parent multi type
-   fixe problème multi application dans parent

# Hornet JS Builder 1.4.0

-   Webpack 2
-   Support KarmaJs
-   Typescript 2.2.2 et possibilité de préciser la version
-   Filtre sur ressources client (module externe et noParse)
-   Correction séparation des dépendances de builds, tests, compile

# Hornet JS Builder 1.3.0

-   Refactoring des sources
-   Support Docker
-   Typescript 2.1.5 et possibilité de préciser la version
-   Filtre sur ressources client
-   Personnalisation des routes
-   Externalisation possible de la configuration webpack
-   Dépendance thème embarqué dans package.json
-   Séparation des dépendances de builds, tests, compile
-   Package zip pour la deploiement continue
-   Optimisation sur la récupération des dépendances et la construction

# Hornet JS Builder 1.2.0

-   0057102: [hornet] Ajout de la version dans le calcul des dépendances et l'affichage (heurtemattes) - traité.
-   0057253: [hornet] Evolution typescript 1.8 (heurtemattes) - traité.
-   0058092: [hornet] Utilisation du clean-fix (heurtemattes) - traité.
-   0058001: [hornet] Webpackstream : gestion d'erreur uglify (heurtemattes) - traité.
-   0058087: [hornet] Suppression du check des buildntest à chaque exécution de tâche (heurtemattes) - traité.
-   0058086: [hornet] Ajout de la tâche clean-all (heurtemattes) - traité.
-   0058085: [hornet] Aide sur les tasks du builder (heurtemattes) - traité.
-   0058000: [hornet] Optimisation builder : prepare-package:minified en double (heurtemattes) - traité.

# Hornet JS Builder 1.1.0

-   0055704: [hornet] Qualimétrie : support de tslint-microsoft-contrib (heurtemattes) - traité.
-   0055719: [hornet] Qualimétrie : Amélioration support tslint (heurtemattes) - traité.
-   0054393: [hornet] Plugin gulp "absolutizeModuleRequire" > permettre la résolution des fichiers JSON (buganp) - traité.
-   0055261: [hornet] Intégration webpack dans les buildAndTestDependencies et plugin worker-loader (buganp) - traité.
-   0055341: [hornet] Génération du hash dans l'historique (buganp) - traité.
-   0055609: [hornet] chunk webpack & source-map : faire le lien avec les TS, TSX (buganp) - traité.
-   0055342: [hornet] compile ts dans node_modules + tsconfig (buganp) - traité.
-   0055345: [hornet] Construction des thèmes (buganp) - traité.
-   0054144: [hornet] per-registry : retrieve-registry et publish-registry (buganp) - traité.

# Hornet JS Builder 1.0.0

-   51715 - EXP_INF_IAT - En tant que Exploitant je peux installer l'applitutoriel
-   51716 - INT_PIC_CAT - En tant que Intégrateur je peux construire l'applitutoriel
-   51717 - DEV_ENV_LDA - En tant que Developpeur je peux lancer / debugger l'applitutoriel
-   51718 - DEV_ENV_TAT - En tant que Developpeur je peux tester (unitaire) l'applitutoriel
-   51719 - INT_PIC_CFM - En tant que Intégrateur je peux construire le framework
-   51720 - DEV_ENV_TDF - En tant que Developpeur je peux tester / debuger le framework
-   51721 - DEV_ENV_IEW - En tant que Developpeur je peux installer mon environnement JS
-   51722 - DEV_ENV_IEE - En tant que Developpeur je peux installer mon environnement Java
-   51723 - DEV_ENV_MCF - En tant que Developpeur je peux mesurer la couverture de test du framwork
-   51724 - INT_PIC_MFC - En tant que Intégrateur je peux mesurer la couverture de test du framwork
-   51725 - EXP_INF_PFM - En tant que Exploitant je peux publier / installer le Framework
-   51726 - EXP_INF_PTH - En tant que Exploitant je peux publier / installer les Themes
-   51727 - INT_PIC_CTH - En tant que Intégrateur je peux construire les Themes
-   51728 - DEV_ENV_MCA - En tant que Developpeur je peux mesurer la couverture de test de l'applituto
-   51729 - INT_PIC_MCA - En tant que Intégrateur je peux mesurer la couverture de test de l'applituto
-   51730 - UTI_APT_VAD - En tant que Utilisateur je peux visualiser l'applitutoriel sur le thème diplonet avec son entete
-   51731 - UTI_APT_ACC - En tant que Utilisateur je peux visualiser la page d'accueil
-   51732 - UTI_APT_AID - En tant que Utilisateur je peux En tant qu'utilisateur je visualise la page d'aide
-   51733 - UTI_APT_NPA - En tant que Utilisateur je peux naviguer dans l'applitutoriel via un plan d'application
-   51734 - UTI_APT_NFA - En tant que Utilisateur je peux naviguer dans l'applitutoriel via un fil d'ariane
-   51735 - UTI_APT_PAC - En tant que Utilisateur je peux visualiser la politique d'accessibilité
-   51736 - UTI_APT_EMC - En tant que Utilisateur je peux envoyer un mail de contact
-   51737 - UTI_APT_VLP - En tant que Utilisateur je peux visualiser une liste de partenaire
-   51738 - UTI_APT_ERL - En tant que Utilisateur je peux effectuer une recherche sur la liste des partenaires
-   51739 - UTI_APT_TRT - En tant que Utilisateur je peux trier le résultats du tableau
-   51740 - UTI_APT_APT - En tant que Utilisateur je peux ajouter un partenaire via le tableau
-   51741 - UTI_APT_VPT - En tant que Utilisateur je peux visualiser un partenaire via le tableau
-   51742 - UTI_APT_NPT - En tant que Utilisateur je peux naviguer de page en page pour visualiser les partenaires
-   51743 - UTI_APT_SPP - En tant que Utilisateur je peux supprimer un ou plusieurs partenaires
-   51744 - UTI_APT_FPT - En tant que Utilisateur je peux filtrer les partenaires remontés par la recherche
-   51745 - UTI_APT_VER - En tant que Utilisateur je peux visualiser mes erreurs de saisies sur les champs de recherche
-   51746 - UTI_APT_VEF - En tant que Utilisateur je peux visualiser mes erreurs de saisies sur le filtre du tableau
-   51747 - UTI_APT_VEE - En tant que Utilisateur je peux visualiser mes erreurs de saisies sur la fiche d'édition des partenaires
-   51748 - UTI_APT_ONG - En tant que Utilisateur je peux passer d'un onglet à l'autre sur la page des partenaire
-   51749 - UTI_APT_SEC - En tant que Utilisateur je peux visualiser la liste des secteurs sous forme de tableau
-   51750 - UTI_APT_ASE - En tant que Utilisateur je peux ajouter un secteur
-   51752 - UTI_APT_ESE - En tant que Utilisateur je peux editer un secteur
-   51755 - INT_PIC_CDO - En tant que Intégrateur je peux construire la documentation
-   51760 - INT_APT_PER - En tant que Intégrateur je peux valider les performance de l'applituto
-   51761 - DEV_PIC_EXP - En tant que Developpeur je peux exporter mes objets Java sous un format TypeScript
-   51762 - EXP_INF_IAS - En tant que Exploitant je peux installer l'applitutoriel (service)
-   51763 - INT_PIC_CAS - En tant que Intégrateur je peux construire l'applitutoriel (service)
-   51764 - DEV_ENV_LAS - En tant que Developpeur je peux lancer / debugger l'applitutoriel (service)
-   51765 - DEV_ENV_TAS - En tant que Developpeur je peux tester (unitaire) l'applitutoriel (service)
-   51766 - INT_PIC_CFS - En tant que Intégrateur je peux construire le framework (service)
-   51767 - DEV_ENV_TFS - En tant que Developpeur je peux tester / debuger le framework (service)
-   51769 - EXP_INF_PFS - En tant que Exploitant je peux publier le Framework (service)
-   51770 - DEV_ENV_MAS - En tant que Developpeur je peux mesurer la couverture de test de l'applituto (service)
-   51772 - DEV_SER_MVN - En tant que Developpeur je peux utiliser Maven pour développer l'applitutoriel services
-   51773 - DEV_SER_SP4 - En tant que Developpeur je peux utiliser Spring 4 pour développer l'applitutoriel services
-   51774 - DEV_SER_LBK - En tant que Developpeur je peux utiliser Logback pour développer l'applitutoriel services
-   51775 - DEV_SER_SMV - En tant que Developpeur je peux utiliser Spring MVC pour développer l'applitutoriel services
-   51777 - DEV_SER_MB3 - En tant que Developpeur je peux utiliser MyBatis 3 pour développer l'applitutoriel services
-   51778 - INT_APT_MVN - En tant que IntégrateuirJe peux construire l'application Tuto services avec Maven
-   51779 - EXP_APT_CONF - Je peux configurer l'appli tuto via un ou plusieurs fichier de conf externes à l'appliAfin
-   51780 - DEV_ENV_LINK - En tant que DéveloppeurJe peux gérer les dépendances entre modules Afin de travailler efficacement
-   51781 - DEV_CLI_DBL - En tant que développeur Je peux rendre isomorphe les contôles de validation et de saisie
-   51782 - DEV_ENV_LPD - En tant que Développeur Je peux gérer les PeerDependencies entre modules Afin de travailler efficacement
-   51785 - EXP_DOC_SAT - En tant que Exploitant je peux Installer l'application Tutoriel
-   51786 - EXP_DOC_STH - En tant que Exploitant je peux Installer le CDN (Thème)
-   51787 - DEV_DOC_SER - En tant que Developpeur je peux connaitre les utilisation des composant services
-   51788 - DEV_DOC_NJS - En tant que Developpeur je peux connaitre les utilisation des composant js
-   51789 - DEV_DOC_ARC - En tant que Developpeur je peux connaitre La structure générale de l'application
-   51790 - DEV_APT_BOU - En tant que Developpeur je peux Lancer l'application tutoriel sans services
-   51791 - DEV_APT_HAN - En tant que Developpeur je peux utiliser React pour le template de page
-   51792 - DEV_DEV_DTS - En tant que Developpeur je peux mettre des point d'arret dans les TS
-   51793 - DEV_DEV_SCO - En tant que Developpeur je peux Lancer les application sans ligne de commande
-   51794 - DEV_TEM_TJS - En tant que Developpeur je peux Constuire une application Node JS basée sur yeoman (thème Intranet)
-   51795 - DEV_TEM_TJA - En tant que Developpeur je peux Constuire une application Service basée sur Maven (Archetype)
-   51796 - UTI_APT_ECS - En tant que Utilisateur je peux Exporter les données du tableau partenaire au format CSV
-   51797 - UTI_APT_EXL - En tant que Utilisateur je peux Exporter les données du tableau partenaire au format EXL
-   51798 - UTI_APT_EPD - En tant que Utilisateur je peux Exporter les données du tableau partenaire au format PDF
-   51799 - DEV_APT_TAR - je peux acceder aux composant sans connaitre l'arboressence des composants
-   51800 - DEV_APT_ORG - je peux retrouver mes fichier en fonction du patterne Flux et non de leur technologie
-   51801 - DEV_APT_COD - retrouver les Codification des spécifications dans l'organisation des sources
-   51802 - UTI_APT_I18 - En tant que Utilisateur je peux visualiser l'application dans ma langue.
-   51803 - DEV_APT_SRM - En tant que Developpeur je peux séparer les routes par modules fonctionnel
-   51804 - UTI_APT_ERT - En tant que Utilisateur je peux savoir lorsqu'un traitement n'a pas abouti (erreur technique)
-   51805 - DEV_APT_FLU - En tant que Developpeur je peux Utiliser les contextes Fluxible
-   51806 - DEV_DEV_FTS - En tant que Developpeur je peux importer une seul définition de donn?es
-   51807 - DEV_APT_FIL - En tant que Developpeur je peux Poser run filtre sur une famille d'URL
-   51808 - DEV_APT_AGE - En tant que Developpeur je peux Utiliser des actions de base pour développer mes Action
-   51809 - DEV_APT_STS - En tant que Developpeur je peux Implémenter mes Store sen TS avec Héritage
-   51810 - DEV_APT_CRM - En tant que Developpeur je peux séparer les routes par modules fonctionnel
-   51811 - DEV_CLI_FLU - En tant que Developpeur je peux Utiliser fluxible pour réaliser mes développpement
-   51812 - DEV_DEV_DTW - En tant que Developpeur je peux Debugger en typescript dans l'environnement webstorm
-   51813 - DEV_CLI_SRM - En tant que Developpeur je peux charger les routes par modules fonctionnel
-   52892 - UTI_APT_PCA - En tant que Utilisateur je peux ajouer / modifier un partenaire avec des composants avancés
-   52894 - UTI_APT_GRA - En tant que Utilisateur je peux Visualiser la répartition par secteur
-   52896 - UTI_APT_AUT - En tant que Utilisateur je peux m'identifier
-   52897 - UTI_APT_HAB - En tant que Utilisateur je peux accéder uniquement aux parges autorisées
-   52898 - UTI_APT_CTH - En tant que Utilisateur je peux changer de théme
-   52899 - UTI_APT_TAB - En tant que Utilisateur je peux naviguer avec une tablette
-   52902 - UTI_APT_SMX - En tant que Utilisateur je peux basculer en mode spa / mpa / mixte
-   52903 - UTI_APT_SSB - En tant que Utilisateur je peux ne plus avoir de backend
-   52905 - DEV_CLI_MRE - En tant que Developpeur je peux Utiliser la derniére versino de React
-   52906 - DEV_APT_AND - En tant que Developpeur je peux utiliser des classes en environnement case sensitive
-   52907 - EXP_DOC_ISI - En tant que Exploitant je peux installer une infra simple
-   52908 - UTI_APT_MIF - En tant que Utilisateur je peux visualiser les message d'information
-   52909 - UTI_APT_CTH_1 - En tant que Utilisateur je peux changer de théme
-   52910 - UTI_APT_MOB_1 - En tant que Utilisateur je peux naviguer avec un mobile
-   52911 - DEV_TEM_TTH - En tant que Developpeur je peux générer un projet sur un théme
-   52912 - UTI_APT_FUP - En tant que Utilisateur je peux uploader un fichier sur la fiche partenaire (photo)
-   52916 - EXP_INF_SCE - En tant que Exploitant je peux Séparer les confs d'exploitation des confs d'appli
-   52918 - DEV_CLI_R13 - En tant que Developpeur je peux Utiliser React 0.13
-   52919 - UTI_APT_CLL - En tant que Utilisateur je peux ajouer / modifier un partenaire avec des composants avancés
-   52920 - UTI_APT_CSM - En tant que Utilisateur je peux ajouer / modifier un partenaire avec des composants avancés
-   52921 - DEV_CLI_ACD - En tant que développeur Je peux enchainer les actions en passant le contexte "chaindata"
-   52922 - INT_CLI_SCH - En tant que intégrateur Je peux reconstruire l'application é l'identique dans plusieurs mois.
-   52923 - UTI_CLI_NOT - En tant que Utilisateur je peux afficher le composant Notification de maniére isomorphe
-   52924 - UTI_CLI_CAL - En tant que Utilisateur je peux afficher le composant Calendrier n de maniére isomorphe
-   52925 - UTI_CLI_AUC - En tant que Utilisateur je peux afficher le composant AutoComplete de maniére isomorphe
-   52926 - UTI_CLI_ONG - En tant que Utilisateur je peux afficher le composant Onglets de maniére isomorphe
-   52927 - DEV_CLI_RTE - En tant que Developpeur je peux Migration du routeur pour fonctionnement avec js
-   52928 - DEV_CLI_ACT - En tant que Developpeur je peux Migration du routeur et des actions pour fonctionnement avec js
-   52929 - DEV_CLI_TAB - En tant que Developpeur je peux Afficher le tableau en isomorphe
-   52930 - DEV_DEV_W10 - En tant que Developpeur je peux utiliser le deboggeur webstorm 10 (nécéssite Nodejs 0.12)
-   52931 - INT_MSC_N12 - En tant que Intégrateur je peux construire et installer le projet sur node 0.12
-   52932 - DEV_CLI_ESC - En tant que Developpeur je peux désactiver les protections anti injection SQL (escape)
-   52933 - DEV_CLI_CSR - En tant que Developpeur je peux effectuer une validation d'autenticité de mon formulaire via csrf
-   52934 - EXP_CLI_PCP - En tant que Exploitant je peux paramétrer le contextPath
-   52935 - DEV_CLI_UUS - En tant que Developpeur je peux utiliser de faéon systématique use strict dans mes TS.
-   52936 - DEV_APT_HEL - En tant que Developpeur je peux paramétrer les configurations de sécurité de Helmet
-   52937 - DEV_CLI_HPP - En tant que Developpeur je peux assurer l'absence de doublons dans les paramétres get
-   52938 - DEV_CLI_SHO - En tant que Developpeur je peux configurer les sessions de express (httponly, secure)
-   52939 - DEV_APT_BOM - En tant que Developpeur je peux importer les dépendances par familles (Plans de conf / BOM)
-   52940 - DEV_CLI_LIC - En tant que Developpeur je peux avoir les licences et les changelog des modules
-   52941 - DEV_APT_SPI - En tant que Developpeur je peux savoir lorsqu'un traitement est en cours (spiner)
-   52947 - DEV_DOC_GDF - En tant que Developpeur je peux connaitre les bonnes pratiques pour le framework
-   52950 - DEV_APT_CJS - En tant que Developpeur je peux utiliser un systéme de cache en JS
-   52953 - DEV_SER_LIC - En tant que Developpeur je peux avoir les licences et les changelog des modules
-   52954 - UTI_APT_NMO - En tant que Utilisateur je peux utiliser l'application dans plusieurs onglets
-   52956 - UTI_APT_SPI - En tant que Utilisateur je peux savoir si un traitement est en cours
-   52957 - DEV_APT_UCP - En tant que Developpeur je peux Utiliser un context path

## 2.1.0 (2021-06-08)

No changes.

## 1.0.0 (2021-06-08)

No changes.
