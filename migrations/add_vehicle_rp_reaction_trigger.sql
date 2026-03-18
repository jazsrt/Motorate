-- MOTORATE: Vehicle RP from post reactions
-- Trigger exists live — this migration captures it for version control
-- DO NOT run against live DB — the trigger already exists

CREATE OR REPLACE FUNCTION award_vehicle_rp_on_reaction()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id uuid;
BEGIN
  SELECT vehicle_id INTO v_vehicle_id
  FROM posts WHERE id = NEW.post_id;

  IF v_vehicle_id IS NOT NULL THEN
    UPDATE vehicles
    SET reputation_score = COALESCE(reputation_score, 0) + 2
    WHERE id = v_vehicle_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_vehicle_rp_reaction ON reactions;
CREATE TRIGGER trg_vehicle_rp_reaction
  AFTER INSERT ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION award_vehicle_rp_on_reaction();
