-- Test data for local development
-- Insert a default programming track
INSERT INTO programming_track (id, name, description, type, owner_team_id, is_public)
VALUES ('ptrk_crossfit_dotcom', 'CrossFit.com Main Site', 'Daily workouts from the CrossFit.com main site', 'crossfit', 'team_cokkpu1klwo0ulfhl1iwzpvn', 1);

-- Insert some sample workouts for testing
INSERT INTO workouts (id, name, description, scope, scheme, rounds_to_score, user_id, source_track_id)
VALUES 
('workout_test_001', 'Test AMRAP', 'Test workout for development', 'public', 'rounds-reps', 1, 'usr_cynhnsszya9jayxu0fsft5jg', 'ptrk_crossfit_dotcom'),
('workout_test_002', 'Test For Time', 'Another test workout', 'public', 'time', 1, 'usr_cynhnsszya9jayxu0fsft5jg', 'ptrk_crossfit_dotcom');
