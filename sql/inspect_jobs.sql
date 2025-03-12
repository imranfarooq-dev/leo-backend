SELECT DISTINCT ON (transcription_jobs.id) transcription_jobs.*
FROM transcription_jobs
JOIN images ON images.id = transcription_jobs.image_id
JOIN documents ON images.document_id = documents.id
WHERE user_id = 'user_2sJaEFNgVC3PQBmpcPS1JUTxzl1'