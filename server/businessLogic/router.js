
router.post("/api", function(req, res) {
  // Your code here
  logger.debug(req.param);
  res.send("Ok");
});
