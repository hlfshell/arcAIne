from typing import Dict, List, Tuple

from ollama import Client

from agents.agent import Any, Callable, Prompt
from agents.backends.base import BaseBackend
from agents.backends.common import simple_tool_results_to_prompts
from agents.tools.tool import Tool
from agents.tools.types import ToolArguments, ToolResults


class Ollama(BaseBackend):

    def __init__(
        self,
        model: str,
        tools: List[Tool],
        get_prompt: Callable[..., Prompt],
        host: str = "http://localhost:11434",
        default_temperature: float = 0.7,
        request_timeout: float = 120.0,
        verbose: bool = False,
    ):
        super().__init__(None, tools, max_simultaneous_tools=1)

        self.model = model
        self.get_prompt = get_prompt
        self.default_temperature = default_temperature
        self.verbose = verbose
        self.request_timeout = request_timeout

        self.__client = Client(host)

    def __tool_descriptor(self, tool: Tool) -> Dict:
        properties = {}
        required_args = []

        for arg in tool.args:
            properties[arg.name] = {
                "type": arg.type,
                "description": arg.description,
            }
            if arg.required:
                required_args.append(arg.name)

        return {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required_args,
                },
            },
        }

    def query_model(self, prompt: Prompt):
        return self.__client.chat(
            model=self.model,
            messages=prompt,
            tools=[
                self.__tool_descriptor(tool) for tool in self.tools.values()
            ],
        )

    def parse_for_result(self, response: Dict[str, Any]) -> str:
        return response["message"]["content"]

    def parse_for_tool_calls(
        self, response: Dict[str, Any], stop_at_first_tool: bool = False
    ) -> List[Tuple[str, ToolArguments]]:
        tool_calls_raw = response["message"].get("tool_calls")

        if not tool_calls_raw:
            return []

        tool_calls: List[Tuple[str, ToolArguments]] = []
        for tool_call in tool_calls_raw:
            name = tool_call["function"]["name"]
            args = tool_call["function"]["arguments"]

            tool_calls.append((name, args))

            if stop_at_first_tool:
                return tool_calls

        return tool_calls

    def tool_results_to_prompts(
        self,
        prompt: Prompt,
        results: ToolResults,
    ) -> List[Prompt]:
        return simple_tool_results_to_prompts(prompt, results, "assistant")

    def prepare_prompt(self, **kwargs) -> Prompt:
        return self.get_prompt(kwargs)