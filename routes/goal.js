const express = require("express");
const { authenticateToken } = require("../utils/middleware");
const db = require("../db");

const router = express.Router();

// Get goals
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchTerm = req.query.query || "";
    const offset = (page - 1) * limit;

    const searchQuery = `
      SELECT 
        g.*,
        CASE WHEN gm.user_id IS NOT NULL THEN true ELSE false END AS joined,
        CASE 
          WHEN g.status = 'PENDING' AND gv.user_id IS NOT NULL 
          THEN true 
          ELSE false 
        END AS user_voted,
        COALESCE(gv_total.total_votes, 0) AS vote_count
      FROM goals g
      LEFT JOIN goal_members gm 
             ON g.id = gm.goal_id
            AND gm.user_id = $4
      LEFT JOIN goal_votes gv
             ON g.id = gv.goal_id
            AND gv.user_id = $4
      LEFT JOIN (
        SELECT goal_id, SUM(vote_value) AS total_votes
        FROM goal_votes
        GROUP BY goal_id
      ) AS gv_total
             ON g.id = gv_total.goal_id
      WHERE g.name ILIKE $1
      ORDER BY g.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const values = [
      `%${searchTerm}%`,  
      limit,              
      offset,             
      userId              
    ];
    const result = await db.query(searchQuery, values);
    const countQuery = `
      SELECT COUNT(*) as total
      FROM goals
      WHERE name ILIKE $1
    `;
    const countResult = await db.query(countQuery, [`%${searchTerm}%`]);
    const total = parseInt(countResult.rows[0].total, 10);

    return res.json({
      goals: result.rows,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch goals" });
  }
});



 /**
   * Get all goals the user has joined.
   */
 router.get("/joined", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT g.*
        FROM goals g
        JOIN goal_members gm ON gm.goal_id = g.id
       WHERE gm.user_id = $1
    `;
    console.log("User is",userId)
    const result = await db.query(query, [userId]);
    
    res.json({
      goals: result.rows,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch joined goals" });
  }
});

/**
 *  Get all goals the user owns.
 */
router.get("/owned", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT *
        FROM goals
       WHERE created_by = $1
    `;
    const result = await db.query(query, [userId]);
    
    res.json({
      goals: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch owned goals" });
  }
});


/**
 * GET the goal details
 */

router.get("/:id", authenticateToken, async (req, res) => {
  const goalId = req.params.id;

  try {
    const goalQuery = `
      SELECT 
        g.id,
        g.name,
        g.description,
        g.status,
        u.userName AS "userName"
      FROM goals g
      JOIN users u ON g.created_by = u.id
      WHERE g.id = $1
      LIMIT 1
    `;
    const goalResult = await db.query(goalQuery, [goalId]);

    if (goalResult.rowCount === 0) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const { id, name, description, status, userName } = goalResult.rows[0];

    const memberCountQuery = `
      SELECT COUNT(*) AS member_count
      FROM goal_members
      WHERE goal_id = $1
    `;
    const memberCountResult = await db.query(memberCountQuery, [goalId]);
    const memberCount = parseInt(memberCountResult.rows[0].member_count || "0", 10);

    const accomplishedCountQuery = `
      SELECT COUNT(*) AS accomplished_count
      FROM goal_members
      WHERE goal_id = $1
        AND status = 'COMPLETED'
    `;
    const accomplishedCountResult = await db.query(accomplishedCountQuery, [goalId]);
    const accomplishedCount = parseInt(accomplishedCountResult.rows[0].accomplished_count || "0", 10);

    const tipsQuery = `
      SELECT
        t.id,
        t.title,
        t.content,
        u.userName AS owner,
        COALESCE(up.count, 0) AS number_of_up_vote,
        COALESCE(down.count, 0) AS number_of_down_vote
      FROM tips t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN (
        SELECT tip_id, COUNT(*) AS count
        FROM tip_votes
        WHERE vote_value = 1
        GROUP BY tip_id
      ) AS up ON up.tip_id = t.id
      LEFT JOIN (
        SELECT tip_id, COUNT(*) AS count
        FROM tip_votes
        WHERE vote_value = -1
        GROUP BY tip_id
      ) AS down ON down.tip_id = t.id
      WHERE t.goal_id = $1
      ORDER BY t.created_at DESC
    `;
    const tipsResult = await db.query(tipsQuery, [goalId]);
    const tips = tipsResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      owner: row.owner, 
      numberOfUpVote: parseInt(row.number_of_up_vote, 10),
      numberOfDownVote: parseInt(row.number_of_down_vote, 10),
    }));


    const storiesQuery = `
      SELECT
        ss.id,
        ss.title,
        ss.content,
        u.userName AS owner
      FROM success_stories ss
      JOIN users u ON ss.user_id = u.id
      WHERE ss.goal_id = $1
      ORDER BY ss.created_at DESC
    `;
    const storiesResult = await db.query(storiesQuery, [goalId]);
    const successStories = storiesResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      owner: row.owner,
    }));

    const responseData = {
      id,
      name,
      description,
      status,
      userName,
      accomplishedCount,
      memberCount,
      tips,
      successStories,
    };

    return res.json(responseData);
  } catch (error) {
    console.error("Failed to fetch goal details:", error);
    return res.status(500).json({ message: "Failed to fetch goal details" });
  }
});
 
  
  /**
   * Create a new goal.
   */
  router.post("/", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { name, description } = req.body;
  
      const insertGoalQuery = `
        INSERT INTO goals (name, description, created_by, status)
        VALUES ($1, $2, $3, 'PENDING')
        RETURNING id, name, description, created_by, status, created_at
      `;
      const goalValues = [name, description, userId];
      const goalResult = await db.query(insertGoalQuery, goalValues);
  
      if (goalResult.rowCount === 0) {
        return res.status(400).json({ message: "Goal creation failed." });
      }
  
      const newGoal = goalResult.rows[0];
      const newGoalId = newGoal.id;

      const insertMemberQuery = `
        INSERT INTO goal_members (goal_id, user_id, role, joined_at, status)
        VALUES ($1, $2, 'owner', NOW(), 'JOINED')
      `;
   
      await db.query(insertMemberQuery, [newGoalId, userId]);
  

      res.status(201).json({
        message: "Goal created successfully",
        goal: newGoal,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

/**
 * Delete a goal (only if the user owns it).
 */
router.delete("/:goalId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { goalId } = req.params;

    // Check if the goal exists and is owned by the user
    const checkQuery = `
      SELECT * FROM goals
      WHERE id = $1 AND created_by = $2
    `;
    const checkResult = await db.query(checkQuery, [goalId, userId]);

    if (checkResult.rowCount === 0) {
      return res.status(403).json({ message: "You do not have permission to delete this goal or goal does not exist." });
    }
    
    const deleteQuery = `
      DELETE FROM goals WHERE id = $1 RETURNING *
    `;
    const deleteResult = await db.query(deleteQuery, [goalId]);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json({ message: "Goal deleted successfully" });
  } catch (error) {
    console.error("Failed to delete goal:", error);
    res.status(500).json({ message: "Failed to delete goal" });
  }
});

  
  
  /**
   * Vote for a goal. 
   */

  router.post("/:goalId/vote", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { goalId } = req.params;
      const { action } = req.body;
  
      if (!["upvote", "remove"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Use 'upvote' or 'remove'." });
      }
  
      if (action === "upvote") {
        const upvoteQuery = `
          INSERT INTO goal_votes (goal_id, user_id, vote_value)
          VALUES ($1, $2, 1)
          ON CONFLICT (goal_id, user_id)
          DO UPDATE SET vote_value = EXCLUDED.vote_value
        `;
        await db.query(upvoteQuery, [goalId, userId]);
  
        const sumQuery = `
          SELECT SUM(vote_value) AS total_votes
          FROM goal_votes
          WHERE goal_id = $1
        `;
        const sumResult = await db.query(sumQuery, [goalId]);
        const totalVotes = parseInt(sumResult.rows[0].total_votes || "0", 10);
  
        const threshold = 2; 
        if (totalVotes >= threshold) {

          await db.query(
            `UPDATE goals
                SET status = 'ACTIVE'
              WHERE id = $1
                AND status = 'PENDING'`,
            [goalId]
          );
        }
  
        return res.json({ message: "Goal upvoted successfully" });
      } 

      else {
        const deleteQuery = `
          DELETE FROM goal_votes
           WHERE goal_id = $1
             AND user_id = $2
        `;
        const result = await db.query(deleteQuery, [goalId, userId]);
  
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "No existing vote to remove" });
        }
        return res.json({ message: "Vote removed successfully" });
      }
    } catch (error) {
      console.error("Failed to process vote:", error);
      return res.status(500).json({ message: "Failed to process vote" });
    }
  });
  
  
  
  /**
   * Add a tip to a goal.  
   */
  router.post("/:goalId/tips", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { goalId } = req.params;
      const { tip } = req.body;
  
      const query = `
        INSERT INTO tips (goal_id, user_id, title, content)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const result = await db.query(query, [goalId, userId, tip.title, tip.content]);
  
      res.status(201).json({
        message: "Tip added successfully",
        tip: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to add tip" });
    }
  });

  /**
 * Return all tips for a specific goal, along with the total vote count for each tip.
 */
router.get("/:goalId/tips", authenticateToken, async (req, res) => {
  try {
    const { goalId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.searchTerm ? `%${req.query.searchTerm}%` : "%%";

    const tipsQuery = `
      SELECT 
        t.*,
        COALESCE(v.vote_count, 0) AS vote_count
      FROM tips t
      LEFT JOIN (
        SELECT tip_id, SUM(vote_value) AS vote_count
        FROM tip_votes
        GROUP BY tip_id
      ) v ON t.id = v.tip_id
      WHERE t.goal_id = $1
        AND t.content ILIKE $2
      ORDER BY t.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const tipsResult = await db.query(tipsQuery, [goalId, searchTerm, limit, offset]);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM tips
      WHERE goal_id = $1
        AND content ILIKE $2
    `;
    const countResult = await db.query(countQuery, [goalId, searchTerm]);
    const total = parseInt(countResult.rows[0].total, 10);

    return res.json({
      tips: tipsResult.rows,
      page,
      limit,
      total,
    });
  } catch (error) {
    console.error("Failed to fetch tips:", error);
    res.status(500).json({ message: "Failed to fetch tips" });
  }
});


  /**
   *  Vote a tip.  
   */
 
router.post("/:goalId/tips/:tipId/vote", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { goalId, tipId } = req.params;
    const { voteValue } = req.body;
    console.log(voteValue)

    if (![1, -1].includes(voteValue)) {
      return res.status(400).json({ message: "voteValue must be +1 or -1." });
    }
    const query = `
      INSERT INTO tip_votes (tip_id, user_id, vote_value)
      VALUES ($1, $2, $3)
      ON CONFLICT (tip_id, user_id)
      DO UPDATE SET vote_value = EXCLUDED.vote_value
    `;
    await db.query(query, [tipId, userId, voteValue]);

    return res.json({ message: "Tip vote recorded successfully" });
  } catch (error) {
    console.error("Failed to vote on tip:", error);
    return res.status(500).json({ message: "Failed to vote on tip" });
  }
});

  
  /**
   * Join a goal.   
   */
  router.post("/:goalId/join", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { goalId } = req.params;
      console.log("Joining goal", goalId)
      
      const query = `
        INSERT INTO goal_members (goal_id, user_id, role, status, joined_at)
        VALUES ($1, $2, 'member', 'JOINED', NOW())
        RETURNING *
      `;
      const result = await db.query(query, [goalId, userId]);
  
      res.json({
        message: "Joined goal successfully",
        membership: result.rows[0],
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Failed to join goal" });
    }
  });
  
  /**
   *  Add a success story to a goal.
   */
  router.post("/:goalId/successStories", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { goalId } = req.params;
      const { successStory } = req.body;
  
      const query = `
        INSERT INTO success_stories (goal_id, user_id, title, content)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const result = await db.query(query, [goalId, userId, successStory.title, successStory.content]);
  
      res.json({
        message: "Success story added",
        story: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to add success story" });
    }
  });

  /**
 * 
 * Return all success stories for a given goal.
 * 
 */
router.get("/:goalId/successStories", authenticateToken, async (req, res) => {
  try {
    const { goalId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 1) Fetch success stories
    const storiesQuery = `
      SELECT ss.*
      FROM success_stories ss
      WHERE ss.goal_id = $1
      ORDER BY ss.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const storiesResult = await db.query(storiesQuery, [goalId, limit, offset]);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM success_stories
      WHERE goal_id = $1
    `;
    const countResult = await db.query(countQuery, [goalId]);
    const total = parseInt(countResult.rows[0].total, 10);

    return res.json({
      successStories: storiesResult.rows,
      page,
      limit,
      total,
    });
  } catch (error) {
    console.error("Failed to fetch success stories:", error);
    res.status(500).json({ message: "Failed to fetch success stories" });
  }
});

  
  /**
   * 8. Complete a goal (for the current user).
   */
  router.put("/:goalId/complete", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { goalId } = req.params;
  
  
      const membershipCheckQuery = `
        SELECT *
          FROM goal_members
         WHERE user_id = $1
           AND goal_id = $2
         LIMIT 1
      `;
      const membershipResult = await db.query(membershipCheckQuery, [userId, goalId]);
  
      if (membershipResult.rowCount === 0) {
        return res.status(404).json({ message: "Membership not found or goal not joined" });
      }
  
      const membership = membershipResult.rows[0];
  

      if (membership.status === "COMPLETED") {

        return res.status(409).json({ message: "You have already completed this goal." });
      }
  
      const updateQuery = `
        UPDATE goal_members
           SET status = 'COMPLETED'
         WHERE user_id = $1
           AND goal_id = $2
         RETURNING *
      `;
      const updateResult = await db.query(updateQuery, [userId, goalId]);
      const updatedMembership = updateResult.rows[0];
  
      return res.json({
        message: "Goal marked as completed",
        membership: updatedMembership,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to complete goal" });
    }
  });
  
  
  /**
   *  Leave a goal (remove membership).
   */
  router.delete("/:goalId/leave", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { goalId } = req.params;
      
      const query = `
        DELETE FROM goal_members
         WHERE user_id = $1
           AND goal_id = $2
         RETURNING *
      `;
      const result = await db.query(query, [userId, goalId]);
  
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Membership not found or already left" });
      }
  
      res.json({
        message: "Left the goal successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to leave goal" });
    }
  });

  /**
   *  Fetch chat messages
   */
router.get("/:goalId/chatMessages", authenticateToken, async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user.id;

    const membershipCheck = `
      SELECT 1
      FROM group_members
      WHERE user_id = $1
        AND group_id = $2
    `;
    const memberResult = await db.query(membershipCheck, [userId, goalId]);
    if (memberResult.rowCount === 0) {
      return res.status(403).json({ message: "Forbidden: not a member of this group" });
    }

    const messagesQuery = `
      SELECT cm.*, u.username
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
       WHERE cm.group_id = $1
       ORDER BY cm.created_at ASC
       LIMIT 100 
    `;
    const messagesResult = await db.query(messagesQuery, [goalId]);

    return res.json({
      messages: messagesResult.rows,
    });
  } catch (error) {
    console.error("Failed to fetch chat messages:", error);
    res.status(500).json({ message: "Failed to fetch chat messages" });
  }
});

  
  module.exports = router;