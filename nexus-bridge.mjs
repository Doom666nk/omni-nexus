import { exec } from 'child_process';

// Ce code centralise tous les ordres de ta PWA
export default async function orchestrate(req) {
  const data = await req.json();
  console.log("Nexus Action reçue :", data.action);
  
  // Exécute le skill correspondant dans ton dossier fusionné
  exec(`node skills/${data.action}.mjs`, (err, stdout, stderr) => {
    if (err) return console.error("Erreur :", stderr);
    console.log("Sortie Nexus :", stdout);
  });
}
