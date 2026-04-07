module.exports = async function writeConversation() {
  return {
    event: "assistant_message",
    captureOutputPath: "__CAPTURE_OUTPUT_PATH__"
  };
};
