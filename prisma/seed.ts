/**
 * Seed : crée (ou promeut) le compte ADMIN initial.
 *
 *   ADMIN_EMAIL=moi@exemple.fr ADMIN_PASSWORD=... ADMIN_NICKNAME=Boss npm run db:seed
 *
 * - Refuse de s'exécuter si un ADMIN existe déjà (sauf s'il s'agit du même e-mail).
 * - ADMIN_PASSWORD est facultatif si tu te connectes avec Google.
 * - Option : SEED_DEMO_PLAYERS=10 crée des joueurs de démonstration (développement uniquement).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (email) {
    const nickname = process.env.ADMIN_NICKNAME?.trim() || "Admin";
    const password = process.env.ADMIN_PASSWORD;
    const otherAdmin = await prisma.user.findFirst({ where: { role: "ADMIN", NOT: { email } } });
    if (otherAdmin) throw new Error("Un ADMIN existe déjà : le seed ne crée pas de second ADMIN.");
    if (password && password.length < 12) throw new Error("ADMIN_PASSWORD doit faire au moins 12 caractères.");

    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, role: "ADMIN", nickname, nicknameKey: normalize(nickname), passwordHash },
      update: { role: "ADMIN", ...(passwordHash ? { passwordHash } : {}) },
    });
    console.log(`✔ ADMIN prêt : ${user.email} (${user.nickname ?? "surnom à choisir"})`);
  } else {
    console.log("ℹ ADMIN_EMAIL absent : aucun ADMIN créé (utilise /admin/setup avec ADMIN_SETUP_SECRET).");
  }

  const demo = Number(process.env.SEED_DEMO_PLAYERS ?? 0);
  if (demo > 0) {
    if (process.env.NODE_ENV === "production") throw new Error("Pas de joueurs de démo en production.");
    const names = ["Zizou", "Le Mur", "Pipo", "Turbo", "Messi du 06", "Gigi", "La Pioche", "Rocket", "Tonton", "Bichette", "Cafu", "Ronnie"];
    const passwordHash = await bcrypt.hash("demo-password", 12);
    for (const nickname of names.slice(0, demo)) {
      const mail = `${normalize(nickname).replace(/[^a-z0-9]/g, "")}@demo.local`;
      await prisma.user.upsert({
        where: { email: mail },
        create: { email: mail, nickname, nicknameKey: normalize(nickname), passwordHash },
        update: {},
      });
    }
    console.log(`✔ ${Math.min(demo, names.length)} joueurs de démo (mot de passe : demo-password)`);
  }
}

main()
  .catch((e) => {
    console.error("✖", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
