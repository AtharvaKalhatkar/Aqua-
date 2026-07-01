@echo off
mkdir target\jpackage_in
copy /Y target\aqua-management-system-1.0.0.jar target\jpackage_in\
rmdir /s /q target\clean_exe
jpackage --type app-image --name AquaManagement --input target\jpackage_in --main-jar aqua-management-system-1.0.0.jar --main-class com.aqua.Launcher --dest target\clean_exe --win-console
"C:\Users\Lenovo\AppData\Local\Programs\Inno Setup 6\iscc.exe" setup.iss
