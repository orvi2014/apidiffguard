-- Mattermost as a first-class alert channel.
--
-- A Mattermost incoming webhook speaks the same wire format as Slack's -- a
-- JSON body with a `text` field -- so delivery needs no new transport. What it
-- could not reuse is Slack's validation, which pins the host to
-- hooks.slack.com: Mattermost is usually self-hosted on the customer's own
-- domain. Saving it as a generic WEBHOOK did not work either, because that
-- branch posts a structured payload with no `text` key, which Mattermost
-- rejects with a 400.

alter type alert_channel add value if not exists 'MATTERMOST';
