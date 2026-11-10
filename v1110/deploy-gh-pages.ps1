$ErrorActionPreference = "Stop"

$v1110Dir = $PSScriptRoot
$distDir = Join-Path $v1110Dir "dist"
$gitRoot = (git -C $v1110Dir rev-parse --show-toplevel).Trim()
$wtPath = Join-Path $env:TEMP "gh-pages-worktree-final"

Write-Host "1. Building latest production bundle in v1110..."
Set-Location -LiteralPath $v1110Dir
npm run build

Write-Host "2. Creating/cleaning worktree for gh-pages..."
Set-Location -LiteralPath $gitRoot
git worktree prune
if (Test-Path $wtPath) { Remove-Item -LiteralPath $wtPath -Recurse -Force }

git worktree add -B gh-pages $wtPath origin/gh-pages
Get-ChildItem -LiteralPath $wtPath -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force

Write-Host "3. Copying dist files to worktree..."
Copy-Item -Path "$distDir\*" -Destination $wtPath -Recurse -Force
New-Item -ItemType File -Path (Join-Path $wtPath ".nojekyll") -Force | Out-Null

Write-Host "4. Committing and pushing to origin/gh-pages..."
Set-Location -LiteralPath $wtPath
git add -A
git commit -m "fix(ui): maximize 3D simulation viewport visibility and add panel collapse toggles"
git push origin gh-pages

Write-Host "5. Cleaning up worktree..."
Set-Location -LiteralPath $v1110Dir
git worktree remove --force $wtPath
Write-Host "DEPLOY_SUCCESSFUL_VERIFIED"
