namespace Dsa.LinkedList;

/// <summary>
/// Random ko'rsatkichli tugun (LeetCode "Node"). Bu — masala emas, umumiy tuzilma.
/// </summary>
public class RandomNode
{
    public int Val;
    public RandomNode? Next;
    public RandomNode? Random;

    public RandomNode(int val)
    {
        Val = val;
    }
}

/// <summary>
/// LeetCode 138. Copy List with Random Pointer
/// Pattern: Linked List + Hash — eski→yangi map, keyin next/random'ni ulash.
/// TODO: yech — Time: ?, Space: ?
/// </summary>
public static class CopyListWithRandomPointer
{
    public static RandomNode? Solve(RandomNode? head)
    {
        throw new NotImplementedException();
    }
}
