-- Expression GIN index for the wiki full-text search. The expression must
-- match the one used at query time in searchWikiPages exactly.
CREATE INDEX "WikiPage_fts_idx" ON "WikiPage" USING GIN (to_tsvector('german', "title" || ' ' || "searchText"));
