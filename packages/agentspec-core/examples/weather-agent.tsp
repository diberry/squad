import "@agentspec/core";
using AgentSpec;

/**
 * Minimal weather agent example — illustrates the core decorator API.
 * Run: tsp compile examples/weather-agent.tsp
 * Output: .agentspec/weather-agent-manifest.json
 */

@agent("weather-agent", "Provides real-time weather data and forecasts for any location")
@role("Weather Specialist")
@version("0.1.0")
@instruction("""
  You are a weather assistant. Answer questions about current conditions,
  forecasts, and historical weather data. Always cite your data source.
  Provide temperatures in both Celsius and Fahrenheit unless the user specifies.
""")
@capability("current-conditions", "Real-time weather for a given location")
@capability("forecast", "Multi-day weather forecasts up to 10 days")
@capability("historical", "Historical weather data and averages")
@boundary(
  "Weather queries, forecasts, climate data, severe weather alerts",
  "Air quality, UV index, astronomical events, sports or travel recommendations"
)
@tool("openweathermap", "OpenWeatherMap API for current conditions and forecasts")
@tool("noaa", "NOAA API for historical data and severe weather alerts")
@memory(MemoryStrategy.session)
@conversationStarter("What's the weather like in Seattle right now?")
@conversationStarter("Will it rain this weekend in Chicago?")
@inputMode(InputMode.text)
@outputMode(OutputMode.text)
@outputMode(OutputMode.structured)
model WeatherAgent {}
