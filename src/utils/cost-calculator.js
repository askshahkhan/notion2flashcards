// OpenAI API cost calculator utility
// Pricing as of 2024 (prices may change - check https://openai.com/pricing)

export class CostCalculator {
  static PRICING = {
    'gpt-3.5-turbo': {
      input: 0.001,    // $0.001 per 1K tokens
      output: 0.002    // $0.002 per 1K tokens
    },
    'gpt-4': {
      input: 0.03,     // $0.03 per 1K tokens
      output: 0.06     // $0.06 per 1K tokens
    },
    'gpt-4-turbo': {
      input: 0.01,     // $0.01 per 1K tokens
      output: 0.03     // $0.03 per 1K tokens
    }
  };

  // Calculate cost based on usage data from OpenAI API response
  static calculateCost(model, usage) {
    if (!usage || !usage.prompt_tokens || !usage.completion_tokens) {
      console.warn('Missing usage data for cost calculation');
      return null;
    }

    const pricing = this.PRICING[model.toLowerCase()];
    if (!pricing) {
      console.warn(`Unknown model for pricing: ${model}`);
      return null;
    }

    // Convert tokens to thousands for pricing calculation
    const inputTokens = usage.prompt_tokens / 1000;
    const outputTokens = usage.completion_tokens / 1000;

    const inputCost = inputTokens * pricing.input;
    const outputCost = outputTokens * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      inputCost: inputCost,
      outputCost: outputCost,
      totalCost: totalCost,
      model: model
    };
  }

  // Format cost information for display
  static formatCostDisplay(costInfo) {
    if (!costInfo) return 'Cost calculation unavailable';

    const totalCostFormatted = (costInfo.totalCost).toFixed(4);
    const inputCostFormatted = (costInfo.inputCost).toFixed(4);
    const outputCostFormatted = (costInfo.outputCost).toFixed(4);

    return {
      summary: `Total cost: $${totalCostFormatted}`,
      detailed: `${costInfo.model} | Input: ${costInfo.inputTokens} tokens ($${inputCostFormatted}) | Output: ${costInfo.outputTokens} tokens ($${outputCostFormatted}) | Total: $${totalCostFormatted}`
    };
  }
}