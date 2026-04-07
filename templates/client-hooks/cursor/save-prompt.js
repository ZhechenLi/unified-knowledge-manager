module.exports = async function savePrompt() {
  return {
    event: "user_prompt",
    captureOutputPath: "__CAPTURE_OUTPUT_PATH__"
  };
};
