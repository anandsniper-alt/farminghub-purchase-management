-- CreateTable
CREATE TABLE "column_preferences" (
    "id" TEXT NOT NULL,
    "listKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "userId" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "column_preferences_pkey" PRIMARY KEY ("id")
);
 
-- CreateIndex
CREATE INDEX "column_preferences_userId_idx" ON "column_preferences"("userId");
 
-- CreateIndex
CREATE UNIQUE INDEX "column_preferences_listKey_scope_userId_key" ON "column_preferences"("listKey", "scope", "userId");
 
-- AddForeignKey
ALTER TABLE "column_preferences" ADD CONSTRAINT "column_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
