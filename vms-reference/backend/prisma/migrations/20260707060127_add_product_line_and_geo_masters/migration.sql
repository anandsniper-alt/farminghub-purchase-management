-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "districtId" TEXT,
ADD COLUMN     "productLineId" TEXT,
ADD COLUMN     "stateId" TEXT;
 
-- CreateTable
CREATE TABLE "product_lines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "product_lines_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);
 
-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);
 
-- CreateIndex
CREATE UNIQUE INDEX "product_lines_name_key" ON "product_lines"("name");
 
-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");
 
-- CreateIndex
CREATE INDEX "states_countryId_idx" ON "states"("countryId");
 
-- CreateIndex
CREATE UNIQUE INDEX "states_countryId_name_key" ON "states"("countryId", "name");
 
-- CreateIndex
CREATE INDEX "districts_stateId_idx" ON "districts"("stateId");
 
-- CreateIndex
CREATE UNIQUE INDEX "districts_stateId_name_key" ON "districts"("stateId", "name");
 
-- CreateIndex
CREATE INDEX "vendors_countryId_idx" ON "vendors"("countryId");
 
-- CreateIndex
CREATE INDEX "vendors_stateId_idx" ON "vendors"("stateId");
 
-- CreateIndex
CREATE INDEX "vendors_districtId_idx" ON "vendors"("districtId");
 
-- CreateIndex
CREATE INDEX "vendors_productLineId_idx" ON "vendors"("productLineId");
 
-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_productLineId_fkey" FOREIGN KEY ("productLineId") REFERENCES "product_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
