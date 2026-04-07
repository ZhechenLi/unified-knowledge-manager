module.exports = async function appendShell() {
  return {
    event: "shell_command",
    captureOutputPath: "__CAPTURE_OUTPUT_PATH__"
  };
};
