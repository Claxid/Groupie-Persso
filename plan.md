# Plan de projet — Groupie-Persso

## 1. Résumé exécutif
Ce document présente le plan de projet pour la livraison et l'évolution de l'application "Groupie-Persso" (service web en Go, front statique/js). Il décrit les objectifs, le périmètre, les livrables, le planning, les ressources nécessaires, les risques et le plan de communication.

## 2. Contexte
Le dépôt contient une application backend en Go (`main.go`, `internal/`) et des ressources frontales statiques dans `web/static/` et `static/`. Les templates HTML sont dans `web/templates/`. L'objectif est stabiliser, documenter et préparer un déploiement reproductible et maintenable.

## 3. Objectifs (SMART)
- **S**pécifique : Produire une version stable et documentée de l'application capable de servir les pages et l'API.
- **M**esurable : Tests unitaires et d'intégration passés, build Docker fonctionnel, déploiement sur un environnement staging.
- **A**ccepté : Par l'équipe (validation QA) et le product owner.
- **R**éaliste : Utiliser la base existante (Go + templates) et ajouter les tests manquants.
- **T**emporel : version staging livrée sous 4 semaines (estimé).

## 4. Périmètre
- Inclut : audit code, corrections critiques, tests unitaires pour le backend, scripts de build/deploy (Docker), documentation d'exécution, plan de monitoring minimal.
- Exclut : refonte UX majeure, migration de base de données complexe (sauf si critique), fonctionnalités demandées hors scope du dépôt actuel.

## 5. Livrables
- `plan.md` (ce document)
- Rapport d'audit technique (README_AUDIT.md)
- Tests unitaires et d'intégration ajoutés (dossier `internal/.../_test.go`)
- Dockerfile et `docker-compose.yml` pour dev/staging
- Guide de déploiement (DEPLOY.md)
- Version stagée déployée et accessible pour recette

## 6. Échéancier et jalons (estimations)
- Semaine 0 (préparation) : Revue du code, installer l'environnement dev.
- Semaine 1 : Audit technique + correction des bugs bloquants.
- Semaine 2 : Écriture des tests unitaires backend + tests basiques frontend.
- Semaine 3 : Packaging (Dockerfile, compose), intégration continue simple.
- Semaine 4 : Déploiement sur staging, recette, corrections finales.

Jalons clés :
- M1 — Audit terminé
- M2 — Tests critiques ajoutés
- M3 — Image Docker buildée
- M4 — Déploiement staging fonctionnel

## 7. Ressources & rôles
- **Chef de projet / PO** : valide priorités, accepte livrables.
- **Développeur Go (backend)** : audits, tests, corrections.
- **Développeur Frontend** : vérifie templates et scripts statiques (`web/static/js` et `static/js`).
- **DevOps / CI** : écrit Dockerfile, configuration CI simple.
- **QA** : exécute recettes sur staging.

Pour une petite équipe, une personne polyglotte peut couvrir plusieurs rôles.

## 8. Estimation budgétaire (ordre de grandeur)
- Effort total estimé : 4 personnes × 1 semaine (ou 1 personne × 4 semaines).
- Coût : dépend du tarif journalier ; estimer en jours-homme et convertir selon vos taux.

## 9. Risques et mitigations
- Risque : tests inexistants -> mitigation : prioriser les tests critiques (handlers, services).
- Risque : dépendances manquantes/documentation -> mitigation : préparer README d'installation et scripts d'initialisation.
- Risque : régression lors du packaging -> mitigation : pipeline CI qui exécute tests avant build.

## 10. Plan de communication
- Points hebdomadaires courts (15–30 min) pour suivre progrès.
- Canal principal : email/Slack + dépôt Git pour issues et PR.
- Revue de jalon avec démonstration sur staging.

## 11. Critères de réussite
- Build Docker reproductible et documenté.
- Suite de tests minimum (couverture OK sur services critiques).
- Déploiement staging accessible et validé par QA.

## 12. Cartographie rapide du dépôt (fichiers clés)
- **Backend / API**: `internal/api/client.go`, `internal/api/models.go`
- **Handlers**: `internal/handlers/*.go` (filtres, geoloc, home, search)
- **Services**: `internal/services/*.go` (filter_service, geoloc_service, search_service)
- **Utils / helpers**: `internal/utils/helpers.go`
- **Front / templates**: `web/templates/*.html` et `web/static/js/*`
- **Static assets**: `static/` (css, images, js)

## 13. Prochaines étapes recommandées
1. Valider ce plan avec l'équipe (ou fournir le PDF `Groupie_Tracker_Subject (1).pdf` pour adaptation).
2. Ouvrir issues pour : audit technique, tests prioritaires, Dockerfile, CI.
3. Assigner une première itération (Semaine 1) : audit + corrections bloquantes.

---
_Remarque_: ce plan est basé sur l'exploration du dépôt courant. Si vous fournissez le PDF mentionné (`Groupie_Tracker_Subject (1).pdf`), je peux adapter le plan aux exigences exactes du document (livrables, contraintes expérimentales, protocole, etc.).
