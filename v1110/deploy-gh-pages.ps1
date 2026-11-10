Write-Host "1. Building production dist..."
npm run build

Write-Host "2. Copying dist files to temporary folder..."
$tempDir = Join-Path $env:TEMP ([System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Copy-Item -Path "dist\*" -Destination $tempDir -Recurse -Force

Write-Host "3. Creating clean gh-pages-deploy branch..."
git checkout --orphan gh-pages-deploy
git rm -rf . -q

Write-Host "4. Copying dist files to root..."
Copy-Item -Path "$tempDir\*" -Destination . -Recurse -Force
Remove-Item -Path $tempDir -Recurse -Force

# Add .nojekyll to prevent Jekyll processing
New-Item -ItemType File -Path ".nojekyll" -Force | Out-Null

Write-Host "5. Committing and pushing to origin/gh-pages..."
git add .
git commit -m "Deploy production build to GitHub Pages"
git push -f origin gh-pages-deploy:gh-pages

Write-Host "6. Switching back to main branch..."
git checkout -f main
git branch -D gh-pages-deploy

Write-Host "SUCCESS: GitHub Pages deployed successfully!"
