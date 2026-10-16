import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const writeJson = (file, value) => {
	const content = JSON.stringify(value, null, 2);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const temporary = `${file}.${randomUUID()}.tmp`;
	try {
		fs.writeFileSync(temporary, content, { flag: "wx" });
		fs.renameSync(temporary, file);
	} finally {
		fs.rmSync(temporary, { force: true });
	}
};
