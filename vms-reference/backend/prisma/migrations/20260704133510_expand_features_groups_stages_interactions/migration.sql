/*
  Warnings:
 
  - You are about to drop the column `type` on the `photos` table. All the data in the column will be lost.
 
*/
-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('NOTE', 'CALL', 'MEETING', 'VISIT', 'ONLINE', 'VOICE', 'DOCUMENT');
 
-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('AUDIO', 'DOCUMENT', 'IMAGE', 'OTHER');
 
-- AlterTable
ALTER TABLE "photos" DROP COLUMN "type",
ADD COLUMN     "typeId" TEXT,
ADD COLUMN     "typeLabel" TEXT NOT NULL DEFAULT 'Product';
 
-- AlterTable
ALTER TABLE "product_categories" ADD COLUMN     "groupId" TEXT;
 
-- AlterTable
ALTER TABLE "samples" ALTER COLUMN "currency" SET DEFAULT 'INR';
 
-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "designation" TEXT,
ADD COLUMN     "stageId" TEXT;
 
-- DropEnum
DROP TYPE "PhotoType";
 
-- CreateTable
CREATE TABLE "category_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "category_groups_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "vendor_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "countsInSourcing" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "vendor_stages_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "photo_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "photo_types_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "currency_rates" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "inrPerUnit" DECIMAL(14,6) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "currency_rates_pkey" PRIMARY KEY ("code")
);
 
-- CreateTable
CREATE TABLE "vendor_contacts" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "designation" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
 
    CONSTRAINT "vendor_contacts_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL DEFAULT 'NOTE',
    "title" TEXT,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 
    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "interaction_attachments" (
    "id" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'DOCUMENT',
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 
    CONSTRAINT "interaction_attachments_pkey" PRIMARY KEY ("id")
);
 
-- CreateIndex
CREATE UNIQUE INDEX "category_groups_name_key" ON "category_groups"("name");
 
-- CreateIndex
CREATE UNIQUE INDEX "vendor_stages_name_key" ON "vendor_stages"("name");
 
-- CreateIndex
CREATE UNIQUE INDEX "photo_types_name_key" ON "photo_types"("name");
 
-- CreateIndex
CREATE INDEX "vendor_contacts_vendorId_idx" ON "vendor_contacts"("vendorId");
 
-- CreateIndex
CREATE INDEX "interactions_vendorId_idx" ON "interactions"("vendorId");
 
-- CreateIndex
CREATE INDEX "interaction_attachments_interactionId_idx" ON "interaction_attachments"("interactionId");
 
-- CreateIndex
CREATE INDEX "product_categories_groupId_idx" ON "product_categories"("groupId");
 
-- CreateIndex
CREATE INDEX "vendors_stageId_idx" ON "vendors"("stageId");
 
-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "category_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "vendor_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "photo_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "interaction_attachments" ADD CONSTRAINT "interaction_attachments_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "interactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
