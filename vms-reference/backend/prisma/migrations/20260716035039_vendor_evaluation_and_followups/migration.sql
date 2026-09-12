-- AlterTable
ALTER TABLE "interactions" ADD COLUMN     "followUpCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followUpCompletedAt" TIMESTAMP(3),
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3);
 
-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "evalCommunication" INTEGER,
ADD COLUMN     "evalCredibility" INTEGER,
ADD COLUMN     "evalCreditSupport" INTEGER,
ADD COLUMN     "evalFinancialStrength" INTEGER,
ADD COLUMN     "evalMarketExposure" INTEGER,
ADD COLUMN     "evalPricingSupport" INTEGER,
ADD COLUMN     "evalProductQuality" INTEGER,
ADD COLUMN     "evalProductionVolume" INTEGER,
ADD COLUMN     "evalQualityControl" INTEGER,
ADD COLUMN     "evalReliability" INTEGER,
ADD COLUMN     "evalWillingness" INTEGER,
ADD COLUMN     "overallPercentage" DOUBLE PRECISION,
ADD COLUMN     "supplierGrade" TEXT,
ADD COLUMN     "supplierStatus" TEXT,
ALTER COLUMN "overallRating" SET DATA TYPE DOUBLE PRECISION;
 
-- CreateIndex
CREATE INDEX "interactions_nextFollowUpAt_idx" ON "interactions"("nextFollowUpAt");
 
-- CreateIndex
CREATE INDEX "vendors_assignedToId_idx" ON "vendors"("assignedToId");
 
-- CreateIndex
CREATE INDEX "vendors_overallRating_idx" ON "vendors"("overallRating");
 
-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
