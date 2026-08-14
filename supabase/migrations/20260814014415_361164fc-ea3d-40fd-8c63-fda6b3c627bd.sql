DROP POLICY IF EXISTS "Customers create own reviews" ON public.product_reviews;

CREATE POLICY "Customers create own reviews"
ON public.product_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id = auth.uid()
  AND EXISTS (
    SELECT 1
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
     WHERE o.id = product_reviews.order_id
       AND o.buyer_id = auth.uid()
       AND o.status = 'delivered'::public.order_status
       AND oi.product_id = product_reviews.product_id
  )
);