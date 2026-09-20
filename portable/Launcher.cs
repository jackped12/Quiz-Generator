using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
class Launcher {
 [STAThread] static void Main() {
  string root=AppDomain.CurrentDomain.BaseDirectory;
  string runtime=Path.Combine(root,"runtime","node.exe");
  string server=Path.Combine(root,"server.cjs");
  if(!File.Exists(runtime)||!File.Exists(server)) {MessageBox.Show("Extract the entire ZIP first, then open Study Room.exe from the extracted folder. Keep the runtime, web, and data folders beside it.","Study Room",MessageBoxButtons.OK,MessageBoxIcon.Information);return;}
  try {
   var info=new ProcessStartInfo(runtime,"\""+server+"\" --open");
   info.WorkingDirectory=root;info.UseShellExecute=false;info.CreateNoWindow=true;
   var process=Process.Start(info);
   if(process.WaitForExit(1800)&&process.ExitCode!=0)MessageBox.Show("Study Room could not start. Make sure this folder is writable, and try again. You can run Start Study Room.cmd to see a diagnostic message.","Study Room",MessageBoxButtons.OK,MessageBoxIcon.Error);
  } catch(Exception) {MessageBox.Show("Study Room could not launch. Extract the complete folder to your Desktop or Documents and try again.","Study Room",MessageBoxButtons.OK,MessageBoxIcon.Error);}
 }
}
