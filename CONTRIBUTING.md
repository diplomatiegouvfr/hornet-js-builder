# Contribution à la communauté Hornet.js

La contribution au projet se fait par `Merge request`.
C'est l'équipe projet du `Pôle Architecture` du MEAE qui valide et merge les contributions dans la documentation définitive.

# Méthodologie : Merge request

- Créer un fork du projet github
- Cloner le fork sur votre machine en local. Le repository remote de github s'appelle `origin`.
- Créer une feature branch depuis `develop` et non `master`
- Ajouter la contribution au projet : cas d'utilisation, composant, ...
- Vérifier la bonne génération du markdown et le style des fichiers de code exemple (code style)
- Adapter la documentation si nécessaire
- Commiter en une seule fois par l'intermédiaire du `rebase`. Eviter le multi-commit.
- Pousser la feature branch sur le fork sur github
- Depuis le fork, ouvrir une Merge request dans la branch `develop`
- Dès que la `Merge request` est approuvée, et mergée, vous pouvez récupérer les modifications


# Critères d'acceptation

- Les modifications sont aussi petites que possible
- La modification concerne un cas précis et n'impacte pas les autres cas d'utilisation, composants, ...
- Le merge request initial contient un seul commit
- Les modifications doivent pouvoir être mergées sans problème
- Ne pas mélanger les corrections et les nouvelles fonctionnalités dans le même merge
- Ne pas ajouter de configuration personnelle
- Ne pas ajouter de modification entrainant des pertes de performances dans le showroom, ex : fichier trop volumineux
- Vérifier la conformité au style de rédaction des markdown et de style de code pour typescript
- L'ajout de nouvelles fonctionnalités au travers de librairie externe doit avoir une attention particulière avec la licence de celle-ci.


# Définition du `Done`

- Description complète décrivant le cas d'usage, composant, ...
- Modification du changelog.md
- La performance a été prise en compte, et testée
- Revue de code réalisée par un responsable de la communauté
- La couverture de code doit être au minimum de 70%
- Merge réalisé par un responsable de la communauté
- Responses aux questions de la communauté terminées et validées 

# Exemple d'une contribution 

## Fork

Réaliser le Fork depuis l'interface github sur le projet `hornet-js`

## Travailler sur le fork

Clone du fork de l'espace perso : username, ex :

```
git clone https://github.com/diplomatiegouvfr/hornet-js.git
```

Création d'une feature branch en local

```
git branch branch-<feature_name>
```

Vérification de la création de la feature branche

```
git branch
```

```
-develop
-<feature_name>
```

Changement de branch

```
git fetch && git checkout <feature_name>
```

```
Switched to branch '<feature_name>'
```

## Merge multi-commit

Vérification des commits

```
git log --stat
```

Merge des commits : squashing commits with rebase 

```
git rebase -i HEAD~2
```

2 : étant le nombre de commit à merger

```
pick d2da3d0 mon commentaire commit 1
pick c80bc7c mon commentaire commit 2
```

Ajouter le mot clé squash aux commits devant disparaître du merge

```
pick d2da3d0 mon commentaire commit 1
squash c80bc7c mon commentaire commit 2
```

Passer au résumé avec exit : `^X`

Un résumé s'affiche.

Valider les actions avec exit : `^X`

## Ajout de la feature branch sur le fork github

Pousser la feature branch sur le fork sur github

```
git push origin <feature_name>
```

## Ouverture de la `Merge request`

Dans l'interface github, et depuis le fork, ouvrir une `Merge request` vers la branche `develop` du projet
Assigner la `Merge Request` à une personne du `pôle architecture` dans la section `Assignee`

```
Title : Titre de la feature
Description : Description de la merge request
Assignee : Assigné à une personne du pôle architecture
Milestone : Pas nécessaire
Labels : Si besoin
Source branch : <feature_name>
target branch : develop
```
