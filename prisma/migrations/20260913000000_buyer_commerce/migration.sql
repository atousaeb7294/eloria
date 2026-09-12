-- CreateTable
CREATE TABLE "buyer_reviews" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "displayName" VARCHAR(60) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "moderationReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preorder_requests" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "customerId" UUID,
    "phone" VARCHAR(30) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'fa',
    "quantity" INTEGER NOT NULL,
    "notes" VARCHAR(500) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'RECEIVED',
    "deliveryNote" VARCHAR(500),
    "orderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preorder_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_audits" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "buyer_reviews_productId_status_createdAt_idx" ON "buyer_reviews"("productId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "buyer_reviews_status_createdAt_idx" ON "buyer_reviews"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "buyer_reviews_productId_customerId_key" ON "buyer_reviews"("productId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "preorder_requests_orderId_key" ON "preorder_requests"("orderId");

-- CreateIndex
CREATE INDEX "preorder_requests_customerId_createdAt_idx" ON "preorder_requests"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "preorder_requests_status_createdAt_idx" ON "preorder_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "commerce_audits_entityId_createdAt_idx" ON "commerce_audits"("entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "buyer_reviews" ADD CONSTRAINT "buyer_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_reviews" ADD CONSTRAINT "buyer_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_reviews" ADD CONSTRAINT "buyer_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorder_requests" ADD CONSTRAINT "preorder_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorder_requests" ADD CONSTRAINT "preorder_requests_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorder_requests" ADD CONSTRAINT "preorder_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorder_requests" ADD CONSTRAINT "preorder_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "buyer_reviews" ADD CONSTRAINT "buyer_reviews_rating_check" CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE "buyer_reviews" ADD CONSTRAINT "buyer_reviews_status_check" CHECK (status IN ('PENDING','APPROVED','REJECTED','HIDDEN'));
ALTER TABLE "preorder_requests" ADD CONSTRAINT "preorder_quantity_check" CHECK (quantity BETWEEN 1 AND 20);
ALTER TABLE "preorder_requests" ADD CONSTRAINT "preorder_status_check" CHECK (status IN ('RECEIVED','REVIEWING','APPROVED','READY','ORDERED','SHIPPED','COMPLETED','CANCELLED'));
