using Dsa.ArraysHashing;

namespace Dsa.Tests.ArraysHashing;

public class TwoSumTests
{
    [Theory]
    [InlineData(new[] { 2, 7, 11, 15 }, 9, new[] { 0, 1 })]
    [InlineData(new[] { 3, 2, 4 }, 6, new[] { 1, 2 })]
    [InlineData(new[] { 3, 3 }, 6, new[] { 0, 1 })]
    public void Solve_ReturnsIndicesOfPairSummingToTarget(int[] nums, int target, int[] expected)
    {
        Assert.Equal(expected, TwoSum.Solve(nums, target));
    }

    [Fact]
    public void Solve_ReturnsEmpty_WhenNoPairExists()
    {
        Assert.Empty(TwoSum.Solve([1, 2, 3], 100));
    }

    [Fact]
    public void Solve_DoesNotReuseSameElementTwice()
    {
        // 3 + 3 = 6, lekin bitta 3 bor — javob bo'lmasligi kerak
        Assert.Empty(TwoSum.Solve([3, 1], 6));
    }

    [Fact]
    public void Solve_HandlesNegativeNumbers()
    {
        Assert.Equal([0, 2], TwoSum.Solve([-3, 4, 3], 0));
    }
}
