-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "bookable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "priceMaxCents" INTEGER;
