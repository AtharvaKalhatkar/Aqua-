@echo off
setlocal enabledelayedexpansion
echo ============================================
echo  Deploying Aqua PWA to GitHub Pages
echo ============================================
echo.

REM 1. Sync source files from mobile-app/ to mobile-app/www/
echo [1/4] Syncing source files to www bundle...
xcopy /Y /I /E "mobile-app\*.html" "mobile-app\www\" >nul
xcopy /Y /I /E "mobile-app\css\*" "mobile-app\www\css\" >nul
xcopy /Y /I /E "mobile-app\js\*" "mobile-app\www\js\" >nul
xcopy /Y /I /E "mobile-app\icons\*" "mobile-app\www\icons\" >nul
copy /Y "mobile-app\sw.js" "mobile-app\www\sw.js" >nul
copy /Y "mobile-app\manifest.json" "mobile-app\www\manifest.json" >nul
echo  Done!

REM 2. Commit and push www changes to main
echo [2/4] Committing to main branch...
git add mobile-app/www
git commit -m "Update PWA deploy bundle"
git push origin main
echo  Done!

REM 3. Extract www subtree and create gh-pages commit with mobile-app/ subdirectory
echo [3/4] Building gh-pages branch...
for /f %%i in ('git subtree split --prefix mobile-app/www main') do set WWW_HASH=%%i

REM Get tree hash of the www commit
for /f %%i in ('git rev-parse !WWW_HASH!^{tree}') do set WWW_TREE=%%i

REM Create root index.html blob that redirects to ./mobile-app/
for /f %%i in ('echo ^<^!DOCTYPE html^>^<html^>^<head^>^<meta http-equiv="refresh" content="0;url=./mobile-app/"^>^<title^>Bhairavnath Aqua^</title^>^</head^>^<body^>^<script^>location.href^=^"./mobile-app/"^</script^>^</body^>^</html^> ^| git hash-object -w --stdin') do set INDEX_BLOB=%%i

REM Create root tree with mobile-app/ subdirectory
for /f %%i in ('echo 040000 tree !WWW_TREE!	mobile-app ^& echo 100644 blob !INDEX_BLOB!	index.html ^| git mktree') do set ROOT_TREE=%%i

REM Create commit
for /f %%i in ('git commit-tree !ROOT_TREE! -m "Deploy PWA"') do set DEPLOY_COMMIT=%%i

REM 4. Force push to gh-pages
echo [4/4] Pushing to gh-pages...
git push origin !DEPLOY_COMMIT!:gh-pages --force
echo  Done!

echo.
echo ============================================
echo  DEPLOY COMPLETE!
echo ============================================
echo.
echo  PWA URL: https://atharvakalhatkar.github.io/Aqua-/mobile-app/
echo  Root URL: https://atharvakalhatkar.github.io/Aqua-/
echo.
