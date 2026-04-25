[Setup]
AppName=Fee Management System
AppVersion=1.0
DefaultDirName={autopf}\FeeManagement
DefaultGroupName=Fee Management System
UninstallDisplayIcon={app}\app_icon.png
Compression=lzma2
SolidCompression=yes
OutputDir=userdocs:Inno Setup Examples Output
OutputBaseFilename=Fee_Management_Setup
SetupIconFile=app_icon.png

[Files]
Source: "*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Fee Management System"; Filename: "{app}\Launcher.vbs"; IconFilename: "{app}\app_icon.png"
Name: "{commondesktop}\Fee Management System"; Filename: "{app}\Launcher.vbs"; IconFilename: "{app}\app_icon.png"

[Run]
Filename: "{app}\INSTALL_ERP.bat"; Description: "Installing System Dependencies..."; Flags: runascurrentuser waituntilterminated
Filename: "{app}\Launcher.vbs"; Description: "Launch Fee Management System Now"; Flags: postinstall nowait
