-- AlterTable
ALTER TABLE "MonthlyReward" ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- Les mois déjà calculés avant l'ajout du bouton restent visibles.
UPDATE "MonthlyReward" SET "publishedAt" = "computedAt" WHERE "publishedAt" IS NULL;
