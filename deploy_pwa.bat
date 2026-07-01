@echo off
setlocal enabledelayedexpansion
echo ============================================
echo  Deploying Aqua PWA to GitHub Pages
echo ============================================
echo.

REM 1. Sync source files from mobile-app/ to mobile-app/www/
echo [1/5] Syncing source files to www bundle...
xcopy /Y /I /E "mobile-app\*.html" "mobile-app\www\" >nul
xcopy /Y /I /E "mobile-app\css\*" "mobile-app\www\css\" >nul
xcopy /Y /I /E "mobile-app\js\*" "mobile-app\www\js\" >nul
xcopy /Y /I /E "mobile-app\icons\*" "mobile-app\www\icons\" >nul
copy /Y "mobile-app\sw.js" "mobile-app\www\sw.js" >nul
copy /Y "mobile-app\manifest.json" "mobile-app\www\manifest.json" >nul
echo  Done!

REM 2. Commit the updated www files to main
echo [2/5] Committing to main branch...
git add mobile-app/www
git commit -m "Update PWA deploy bundle v55"
git push origin main
echo  Done!

REM 3. Split the www subtree
echo [3/5] Extracting www subtree...
for /f %%i in ('git subtree split --prefix mobile-app/www main') do set WWW_HASH=%%i
echo  Subtree hash: !WWW_HASH!

REM 4. Build gh-pages branch with content in mobile-app/ subdirectory
echo [4/5] Building gh-pages branch...
git branch -D gh-pages-deploy 2>nul
git checkout --orphan gh-pages-deploy
git rm -rf . 2>nul

REM Checkout www content into root
git checkout !WWW_HASH! -- .

REM Move everything into mobile-app/ subfolder
if not exist mobile-app mkdir mobile-app
for /f "delims=" %%i in ('dir /b') do (
  if not "%%i"=="mobile-app" move "%%i" "mobile-app\%%i" >nul 2>nul
)
for /d %%i in (*) do (
  if not "%%i"=="mobile-app" move "%%i" "mobile-app\%%i" >nul 2>nul
)

REM Create root index.html that redirects to mobile-app/
echo ^<meta http-equiv="refresh" content="0;url=./mobile-app/"^>^<script^>location.href="./mobile-app/"^</script^> > index.html

git add -A
git commit -m "Deploy PWA v55"
echo  Done!

REM 5. Force push to gh-pages
echo [5/5] Pushing to gh-pages...
git push origin gh-pages-deploy:gh-pages --force
git checkout main
git branch -D gh-pages-deploy 2>nul

echo.
echo ============================================
echo  DEPLOY COMPLETE!
echo ============================================
echo.
echo  Site URL: https://atharvakalhatkar.github.io/Aqua-/mobile-app/
echo.
