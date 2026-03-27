INSERT INTO news_jobs (raw_script, avatar_script, avatar_mp4_url, status)
VALUES (
  'Breaking news from Washington today as the Senate passes landmark climate legislation with overwhelming bipartisan support. The Clean Energy Innovation Act, which has been in development for over eighteen months, received a final vote of 68 to 32, marking one of the most significant environmental policy achievements in decades. Environmental groups are celebrating this as a historic victory, while industry leaders express cautious optimism about the implementation timeline.

The legislation allocates 200 billion dollars over the next ten years for renewable energy infrastructure, including massive investments in wind and solar power generation facilities across the nation. Critics argue the bill doesn''t go far enough, pointing to provisions that maintain subsidies for natural gas as a transition fuel. Supporters counter that pragmatic compromise was necessary to secure the broad coalition needed for passage.

In international developments, tensions continue to escalate in the South China Sea as naval vessels from three nations conducted overlapping military exercises in disputed waters. The United States Seventh Fleet reported close encounters with Chinese warships, while regional allies expressed growing concerns about freedom of navigation. Diplomatic channels remain open, but observers note this represents the most serious confrontation in the region since 2024.

Meanwhile, European markets rallied today following surprisingly strong economic data from Germany and France. The DAX index surged three point seven percent, while the CAC 40 gained two point nine percent, as investors responded positively to better-than-expected manufacturing output figures. Analysts suggest this could signal the beginning of a sustained recovery for the eurozone economy, though concerns about inflation persist.

In technology news, a major breakthrough in quantum computing was announced by researchers at MIT, who successfully demonstrated a 500-qubit processor operating at room temperature. This development could revolutionize the field by eliminating the need for expensive cooling systems that have limited practical applications. Industry experts are calling this a game-changing moment that could accelerate quantum computing adoption across multiple sectors within the next five years.

And finally, in sports, the World Cup qualifying rounds produced several stunning upsets, with underdog teams securing unexpected victories over traditional powerhouses, setting up what promises to be one of the most unpredictable tournaments in recent memory.',
  'Breaking news from Washington today as the Senate passes landmark climate legislation with overwhelming bipartisan support...',
  'C:\Users\konra\ObsidianNewsDesk\avatars\test-avatar-99s.mp4',
  'pending'
)
RETURNING id, status, created_at;
