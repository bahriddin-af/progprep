namespace Dsa.Graphs;

/// <summary>
/// Graf tuguni (LeetCode "Node"). Bu — masala emas, umumiy tuzilma.
/// </summary>
public class GraphNode
{
    public int Val;
    public IList<GraphNode?> Neighbors;

    public GraphNode(int val = 0)
    {
        Val = val;
        Neighbors = new List<GraphNode?>();
    }
}

/// <summary>
/// LeetCode 133. Clone Graph
/// Pattern: DFS/BFS + Hash — eski→yangi map, qo'shnilarni rekursiv nusxala.
/// TODO: yech — Time: ?, Space: ?
/// </summary>
public static class CloneGraph
{
    public static GraphNode? Solve(GraphNode? node)
    {
        throw new NotImplementedException();
    }
}
