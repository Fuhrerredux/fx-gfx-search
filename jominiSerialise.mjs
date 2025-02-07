import { Jomini } from "jomini";
import fs from "fs";

async function jominiParse() {
  const parser = await Jomini.initialize();
  const files = fs.readdirSync("./public/interface");
  for (const file of files) {
    if (file.endsWith(".gfx")) {
      const data = fs.readFileSync(`./public/interface/${file}`);
      const content = parser.parseText(data, (x) => x.json());
      fs.writeFileSync(
        `./public/interface/${file.replace(".gfx", ".json")}`,
        JSON.stringify(content, null, 2)
      );
    }
  }
}

await jominiParse();