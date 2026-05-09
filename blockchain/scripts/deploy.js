const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying Voting Contract...");

  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();

  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log("-----------------------------------------");
  console.log("✅ Voting Contract Deployed to:", address);
  console.log("-----------------------------------------");
  
  // Auto-update files
  const filesToUpdate = [
    { path: path.join(__dirname, "../../frontend/src/main.js"), regex: /const contractAddress = "0x[a-fA-F0-9]+";/ },
    { path: path.join(__dirname, "../../frontend/src/admin.js"), regex: /const contractAddress = "0x[a-fA-F0-9]+";/ },
    { path: path.join(__dirname, "../../backend/main.py"), regex: /VOTING_CONTRACT_ADDRESS = "0x[a-fA-F0-9]+"/ }
  ];

  for (let file of filesToUpdate) {
    if (fs.existsSync(file.path)) {
      let content = fs.readFileSync(file.path, "utf8");
      if (file.path.endsWith('.py')) {
        content = content.replace(file.regex, `VOTING_CONTRACT_ADDRESS = "${address}"`);
      } else {
        content = content.replace(file.regex, `const contractAddress = "${address}";`);
      }
      fs.writeFileSync(file.path, content, "utf8");
      console.log(`✅ Auto-updated address in ${path.basename(file.path)}`);
    } else {
      console.log(`❌ Could not find ${file.path}`);
    }
  }
  console.log("-----------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
