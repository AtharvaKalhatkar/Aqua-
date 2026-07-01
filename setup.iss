[Setup]
AppName=Aqua Management System
AppVersion=3.0
DefaultDirName={autopf}\AquaManagement
DefaultGroupName=Aqua Management
OutputDir=target
OutputBaseFilename=AquaManagement_Setup_Wizard
Compression=lzma
SolidCompression=yes
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Files]
Source: "target\clean_exe\AquaManagement\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Aqua Management"; Filename: "{app}\AquaManagement.exe"
Name: "{commondesktop}\Aqua Management"; Filename: "{app}\AquaManagement.exe"

[Run]
Filename: "{app}\AquaManagement.exe"; Description: "Launch Aqua Management"; Flags: nowait postinstall skipifsilent
