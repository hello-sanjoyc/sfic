select * from participants p 
join participant_applications pa on pa.participant_id = p.id 
join application_form_saves afs on afs.application_id = pa.id 
where pa.status = 'submitted' and afs.is_current = true;