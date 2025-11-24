# Groupie — instructions locales et déploiement Netlify

But: rendre le serveur local identique à ce que Netlify sert (root `index.html` + `/static/`).

Raccourci utiles

- Démarrer le serveur Go local (écoute sur `:8080`):

```powershell
Set-Location -LiteralPath 'c:\Users\hohoj\OneDrive\Bureau\Groupie-perso\Groupie'
go run main.go
```

- Synchroniser les fichiers statiques (copie `web/static` -> `static`):

```powershell
Set-Location -LiteralPath 'c:\Users\hohoj\OneDrive\Bureau\Groupie-perso\Groupie'
.\sync-static.ps1
```

Netlify

- Si vous déployez sur Netlify en tant que site statique, configurez le "Publish directory" sur la racine du repo (le dossier qui contient `index.html`). Netlify servira `index.html` et le dossier `/static`.
- Si vous souhaitez que Netlify serve le contenu de `web` à la place, changez le publish directory sur `web` et adaptez les chemins dans `index.html`.

Notes

- Les autres templates `web/templates/*.html` et les fichiers JS ont été remplacés par des placeholders et redirigent ou renvoient un lien vers `/`.
- Utilisez le script `sync-static.ps1` avant de déployer si vous éditez `web/static` et souhaitez que la racine `static/` soit à jour.
// Placeholder for README.md