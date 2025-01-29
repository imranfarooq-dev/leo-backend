UPDATE images
SET image_path = REGEXP_REPLACE(image_path, '^public/', '')
WHERE image_path LIKE 'public/%';