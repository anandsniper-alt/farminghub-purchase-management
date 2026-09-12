-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PURCHASE', 'VIEWER');
 
-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'BLACKLISTED');
 
-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('NONE', 'REQUESTED', 'RECEIVED', 'APPROVED', 'REJECTED');
 
-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('PRODUCT', 'BOOTH', 'BUSINESS_CARD', 'OTHER');
 
-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PURCHASE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "component_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "component_tags_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "expos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "edition" TEXT,
    "year" INTEGER,
    "city" TEXT,
    "country" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "expos_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "phone" TEXT,
    "wechat" TEXT,
    "email" TEXT,
    "website" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT DEFAULT 'China',
    "expoId" TEXT,
    "communicationRating" INTEGER,
    "reliabilityRating" INTEGER,
    "overallRating" INTEGER,
    "annualVolume" TEXT,
    "remarks" TEXT,
    "sampleStatus" "SampleStatus",
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "samples" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "componentTagId" TEXT,
    "componentName" TEXT,
    "status" "SampleStatus" NOT NULL DEFAULT 'REQUESTED',
    "price" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'USD',
    "priceRemarks" TEXT,
    "qualityRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "samples_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "type" "PhotoType" NOT NULL DEFAULT 'PRODUCT',
    "sizeBytes" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 
    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "_VendorCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
 
-- CreateTable
CREATE TABLE "_VendorComponents" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
 
-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
 
-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");
 
-- CreateIndex
CREATE UNIQUE INDEX "component_tags_name_key" ON "component_tags"("name");
 
-- CreateIndex
CREATE UNIQUE INDEX "expos_name_edition_year_key" ON "expos"("name", "edition", "year");
 
-- CreateIndex
CREATE INDEX "vendors_city_idx" ON "vendors"("city");
 
-- CreateIndex
CREATE INDEX "vendors_expoId_idx" ON "vendors"("expoId");
 
-- CreateIndex
CREATE INDEX "vendors_status_idx" ON "vendors"("status");
 
-- CreateIndex
CREATE INDEX "samples_vendorId_idx" ON "samples"("vendorId");
 
-- CreateIndex
CREATE INDEX "photos_vendorId_idx" ON "photos"("vendorId");
 
-- CreateIndex
CREATE UNIQUE INDEX "_VendorCategories_AB_unique" ON "_VendorCategories"("A", "B");
 
-- CreateIndex
CREATE INDEX "_VendorCategories_B_index" ON "_VendorCategories"("B");
 
-- CreateIndex
CREATE UNIQUE INDEX "_VendorComponents_AB_unique" ON "_VendorComponents"("A", "B");
 
-- CreateIndex
CREATE INDEX "_VendorComponents_B_index" ON "_VendorComponents"("B");
 
-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_expoId_fkey" FOREIGN KEY ("expoId") REFERENCES "expos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_componentTagId_fkey" FOREIGN KEY ("componentTagId") REFERENCES "component_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "_VendorCategories" ADD CONSTRAINT "_VendorCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "_VendorCategories" ADD CONSTRAINT "_VendorCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "_VendorComponents" ADD CONSTRAINT "_VendorComponents_A_fkey" FOREIGN KEY ("A") REFERENCES "component_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "_VendorComponents" ADD CONSTRAINT "_VendorComponents_B_fkey" FOREIGN KEY ("B") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
