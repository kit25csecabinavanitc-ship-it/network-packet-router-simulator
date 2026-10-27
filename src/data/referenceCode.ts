/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CPP_CODE = `/**
 * Cisco / Juniper / AWS MNC Interview Standard
 * Network Packet Router Simulator
 * 
 * Algorithms:
 * 1. Bellman-Ford Distance Vector Routing + Negative Cycle Detection
 * 2. Floyd-Warshall All-Pairs Shortest Path via Adjacency Matrix
 * 3. Routing Table Generation & Packet Forwarding Simulation
 */

#include <iostream>
#include <vector>
#include <string>
#include <iomanip>
#include <queue>
#include <algorithm>

using namespace std;

const int INF = 1e9;

// Directed Network Link
struct Edge {
    int src;
    int dest;
    int weight; // Latency in ms / Routing Metric (supports negative weights)
};

// Router Packet
struct Packet {
    int id;
    int src;
    int dest;
    int ttl;
    int currentHop;
    int totalLatency;
    string payload;
};

class NetworkRouterSimulator {
private:
    int V; // Number of routers
    vector<string> routerNames;
    vector<string> routerIPs;
    vector<Edge> edges;
    vector<vector<int>> adjMatrix;
    vector<vector<int>> nextHop;

public:
    NetworkRouterSimulator(int vertices) : V(vertices) {
        adjMatrix.assign(V, vector<int>(V, INF));
        nextHop.assign(V, vector<int>(V, -1));
        for (int i = 0; i < V; i++) {
            adjMatrix[i][i] = 0;
            nextHop[i][i] = i;
        }
        routerNames.resize(V);
        routerIPs.resize(V);
    }

    void setRouterInfo(int u, string name, string ip) {
        routerNames[u] = name;
        routerIPs[u] = ip;
    }

    void addLink(int u, int v, int weight, bool bidirectional = false) {
        edges.push_back({u, v, weight});
        adjMatrix[u][v] = weight;
        nextHop[u][v] = v;

        if (bidirectional) {
            edges.push_back({v, u, weight});
            adjMatrix[v][u] = weight;
            nextHop[v][u] = u;
        }
    }

    // 1. Bellman-Ford Single-Source Routing with Negative Cycle Detection
    bool runBellmanFord(int src, vector<int>& dist, vector<int>& parent) {
        dist.assign(V, INF);
        parent.assign(V, -1);
        dist[src] = 0;

        // Relax all edges |V| - 1 times
        for (int i = 1; i <= V - 1; i++) {
            bool updated = false;
            for (const auto& edge : edges) {
                if (dist[edge.src] != INF && dist[edge.src] + edge.weight < dist[edge.dest]) {
                    dist[edge.dest] = dist[edge.src] + edge.weight;
                    parent[edge.dest] = edge.src;
                    updated = true;
                }
            }
            if (!updated) break; // Early convergence
        }

        // V-th iteration to detect negative cycle (routing loop)
        for (const auto& edge : edges) {
            if (dist[edge.src] != INF && dist[edge.src] + edge.weight < dist[edge.dest]) {
                cout << "[ALERT] Negative cycle detected! Routing loop trapped between nodes." << endl;
                
                // Trace back negative cycle
                int curr = edge.dest;
                for (int i = 0; i < V; i++) curr = parent[curr];

                vector<int> cycle;
                int v = curr;
                while (true) {
                    cycle.push_back(v);
                    if (v == curr && cycle.size() > 1) break;
                    v = parent[v];
                }
                reverse(cycle.begin(), cycle.end());

                cout << "Loop Path: ";
                for (size_t i = 0; i < cycle.size(); i++) {
                    cout << routerNames[cycle[i]] << (i + 1 < cycle.size() ? " -> " : "");
                }
                cout << endl;
                return true; // Negative cycle exists
            }
        }
        return false;
    }

    // 2. Floyd-Warshall All-Pairs Shortest Paths via Adjacency Matrix
    void runFloydWarshall() {
        cout << "\\n=== RUNNING FLOYD-WARSHALL ALL-PAIRS ROUTING MATRIX ===" << endl;

        for (int k = 0; k < V; k++) {
            for (int i = 0; i < V; i++) {
                for (int j = 0; j < V; j++) {
                    if (adjMatrix[i][k] != INF && adjMatrix[k][j] != INF) {
                        if (adjMatrix[i][k] + adjMatrix[k][j] < adjMatrix[i][j]) {
                            adjMatrix[i][j] = adjMatrix[i][k] + adjMatrix[k][j];
                            nextHop[i][j] = nextHop[i][k];
                        }
                    }
                }
            }
        }

        // Check for negative cycle on diagonal
        for (int i = 0; i < V; i++) {
            if (adjMatrix[i][i] < 0) {
                cout << "[ALERT] Negative cycle detected at node " << routerNames[i] << "!" << endl;
            }
        }

        // Print Adjacency Matrix
        cout << "\\nAll-Pairs Latency Matrix (ms):" << endl;
        cout << setw(8) << " ";
        for (int i = 0; i < V; i++) cout << setw(8) << routerNames[i];
        cout << endl;

        for (int i = 0; i < V; i++) {
            cout << setw(8) << routerNames[i];
            for (int j = 0; j < V; j++) {
                if (adjMatrix[i][j] == INF) cout << setw(8) << "INF";
                else cout << setw(8) << adjMatrix[i][j];
            }
            cout << endl;
        }
    }

    // 3. Print Routing Table (Cisco IOS style)
    void printRoutingTable(int routerId) {
        vector<int> dist, parent;
        bool hasLoop = runBellmanFord(routerId, dist, parent);

        cout << "\\n========================================================" << endl;
        cout << "Routing Table for: " << routerNames[routerId] << " [" << routerIPs[routerId] << "]" << endl;
        cout << "Protocol: Distance Vector (Bellman-Ford)" << endl;
        cout << "Status: " << (hasLoop ? "WARNING: LOOP DETECTED" : "CONVERGED (STABLE)") << endl;
        cout << "========================================================" << endl;
        cout << left << setw(16) << "Destination" 
             << setw(16) << "Gateway/NextHop" 
             << setw(10) << "Metric" 
             << setw(8) << "Hops" 
             << "Interface" << endl;
        cout << string(60, '-') << endl;

        for (int i = 0; i < V; i++) {
            if (i == routerId) {
                cout << left << setw(16) << routerIPs[i] 
                     << setw(16) << "Direct" 
                     << setw(10) << 0 
                     << setw(8) << 0 
                     << "lo0 (Loopback)" << endl;
                continue;
            }

            if (dist[i] == INF) {
                cout << left << setw(16) << routerIPs[i] 
                     << setw(16) << "Unreachable" 
                     << setw(10) << "INF" 
                     << setw(8) << "-" 
                     << "Null0" << endl;
                continue;
            }

            // Find next hop by tracing path
            int curr = i;
            int hops = 0;
            while (parent[curr] != -1 && parent[curr] != routerId) {
                curr = parent[curr];
                hops++;
            }
            hops++;
            int nextHopNode = (parent[curr] == routerId) ? curr : -1;
            string gw = (nextHopNode != -1) ? routerIPs[nextHopNode] : "Unreachable";

            cout << left << setw(16) << routerIPs[i] 
                 << setw(16) << gw 
                 << setw(10) << dist[i] 
                 << setw(8) << hops 
                 << "eth" + to_string(routerId % 4) << endl;
        }
    }

    // 4. Simulate Packet Forwarding
    void forwardPacket(Packet pkt) {
        cout << "\\n[PACKET FORWARDING] Packet #" << pkt.id 
             << " from " << routerNames[pkt.src] << " to " << routerNames[pkt.dest] 
             << " (Payload: \\"" << pkt.payload << "\\", TTL: " << pkt.ttl << ")" << endl;

        int curr = pkt.src;
        while (curr != pkt.dest) {
            if (pkt.ttl <= 0) {
                cout << "[DROP] ICMP Time Exceeded! TTL expired at router " << routerNames[curr] << endl;
                return;
            }

            int nxt = nextHop[curr][pkt.dest];
            if (nxt == -1 || adjMatrix[curr][nxt] == INF) {
                cout << "[DROP] Destination Host Unreachable from " << routerNames[curr] << endl;
                return;
            }

            int hopCost = adjMatrix[curr][nxt];
            pkt.totalLatency += hopCost;
            pkt.ttl--;
            cout << "  -> Forwarded to " << routerNames[nxt] 
                 << " (Hop Latency: " << hopCost << "ms, Total: " << pkt.totalLatency 
                 << "ms, TTL: " << pkt.ttl << ")" << endl;
            curr = nxt;
        }

        cout << "[DELIVERED] Packet delivered to " << routerNames[pkt.dest] 
             << " with Total Latency: " << pkt.totalLatency << "ms!" << endl;
    }
};

int main() {
    NetworkRouterSimulator net(5);
    net.setRouterInfo(0, "R1", "10.0.1.1");
    net.setRouterInfo(1, "R2", "10.0.2.1");
    net.setRouterInfo(2, "R3", "10.0.3.1");
    net.setRouterInfo(3, "R4", "10.0.4.1");
    net.setRouterInfo(4, "R5", "10.0.5.1");

    // Add directed links with potential negative cycle
    net.addLink(0, 1, 5);
    net.addLink(1, 2, 4);
    net.addLink(2, 3, -8); // Negative weight edge
    net.addLink(3, 1, 2);  // Forms loop R2->R3->R4->R2 with cost 4 - 8 + 2 = -2
    net.addLink(2, 4, 6);

    net.runFloydWarshall();
    net.printRoutingTable(0);

    // Forward packet
    Packet p = {101, 0, 4, 16, 0, 0, "SYN_REQUEST"};
    net.forwardPacket(p);

    return 0;
}
`;

export const JAVA_CODE = `/**
 * Cisco / Juniper / AWS MNC Enterprise Grade
 * Java Network Packet Router Simulator
 * 
 * Features:
 * - Distance Vector Routing via Bellman-Ford
 * - Negative Cycle & Routing Loop Detection
 * - Floyd-Warshall All-Pairs Adjacency Matrix
 * - Live Packet Forwarding Simulation
 */

import java.util.*;

public class NetworkPacketRouterSimulator {
    static final int INF = 1000000000;

    static class Edge {
        int src, dest, weight;
        Edge(int src, int dest, int weight) {
            this.src = src;
            this.dest = dest;
            this.weight = weight;
        }
    }

    static class Packet {
        int id;
        int src, dest;
        int ttl;
        int totalLatency;
        String payload;

        Packet(int id, int src, int dest, int ttl, String payload) {
            this.id = id;
            this.src = src;
            this.dest = dest;
            this.ttl = ttl;
            this.totalLatency = 0;
            this.payload = payload;
        }
    }

    private final int V;
    private final String[] routerNames;
    private final String[] routerIPs;
    private final List<Edge> edges;
    private final int[][] adjMatrix;
    private final int[][] nextHop;

    public NetworkPacketRouterSimulator(int vertices) {
        this.V = vertices;
        this.routerNames = new String[V];
        this.routerIPs = new String[V];
        this.edges = new ArrayList<>();
        this.adjMatrix = new int[V][V];
        this.nextHop = new int[V][V];

        for (int i = 0; i < V; i++) {
            Arrays.fill(adjMatrix[i], INF);
            Arrays.fill(nextHop[i], -1);
            adjMatrix[i][i] = 0;
            nextHop[i][i] = i;
        }
    }

    public void setRouter(int u, String name, String ip) {
        routerNames[u] = name;
        routerIPs[u] = ip;
    }

    public void addLink(int u, int v, int weight, boolean bidirectional) {
        edges.add(new Edge(u, v, weight));
        adjMatrix[u][v] = weight;
        nextHop[u][v] = v;

        if (bidirectional) {
            edges.add(new Edge(v, u, weight));
            adjMatrix[v][u] = weight;
            nextHop[v][u] = u;
        }
    }

    // Bellman-Ford Distance Vector Algorithm
    public boolean runBellmanFord(int src, int[] dist, int[] parent) {
        Arrays.fill(dist, INF);
        Arrays.fill(parent, -1);
        dist[src] = 0;

        // Relax edges V - 1 times
        for (int i = 1; i <= V - 1; i++) {
            boolean changed = false;
            for (Edge e : edges) {
                if (dist[e.src] != INF && dist[e.src] + e.weight < dist[e.dest]) {
                    dist[e.dest] = dist[e.src] + e.weight;
                    parent[e.dest] = e.src;
                    changed = true;
                }
            }
            if (!changed) break;
        }

        // V-th iteration: Negative Cycle Check
        for (Edge e : edges) {
            if (dist[e.src] != INF && dist[e.src] + e.weight < dist[e.dest]) {
                System.out.println("[CRITICAL ALERT] Negative Cycle / Routing Loop detected!");
                return true;
            }
        }
        return false;
    }

    // Floyd-Warshall All-Pairs Adjacency Matrix
    public void runFloydWarshall() {
        for (int k = 0; k < V; k++) {
            for (int i = 0; i < V; i++) {
                for (int j = 0; j < V; j++) {
                    if (adjMatrix[i][k] != INF && adjMatrix[k][j] != INF) {
                        if (adjMatrix[i][k] + adjMatrix[k][j] < adjMatrix[i][j]) {
                            adjMatrix[i][j] = adjMatrix[i][k] + adjMatrix[k][j];
                            nextHop[i][j] = nextHop[i][k];
                        }
                    }
                }
            }
        }
    }

    // Packet Simulation
    public void forwardPacket(Packet pkt) {
        System.out.printf("Forwarding Packet #%d [%s -> %s]\\n", 
            pkt.id, routerNames[pkt.src], routerNames[pkt.dest]);
        int curr = pkt.src;

        while (curr != pkt.dest) {
            if (pkt.ttl <= 0) {
                System.out.println("  -> [DROP] TTL Expired at " + routerNames[curr]);
                return;
            }

            int nxt = nextHop[curr][pkt.dest];
            if (nxt == -1 || adjMatrix[curr][nxt] == INF) {
                System.out.println("  -> [DROP] Unreachable network at " + routerNames[curr]);
                return;
            }

            pkt.totalLatency += adjMatrix[curr][nxt];
            pkt.ttl--;
            System.out.printf("  -> Hop %s -> %s (Cost: %dms, Cumulative: %dms, TTL: %d)\\n",
                routerNames[curr], routerNames[nxt], adjMatrix[curr][nxt], pkt.totalLatency, pkt.ttl);
            curr = nxt;
        }
        System.out.println("  -> [DELIVERED] Total Latency: " + pkt.totalLatency + "ms\\n");
    }

    public static void main(String[] args) {
        NetworkPacketRouterSimulator net = new NetworkPacketRouterSimulator(4);
        net.setRouter(0, "NYC-GW", "198.51.100.1");
        net.setRouter(1, "CHI-CORE", "198.51.100.2");
        net.setRouter(2, "ATL-HUB", "198.51.100.3");
        net.setRouter(3, "DFW-CORE", "198.51.100.4");

        net.addLink(0, 1, 18, true);
        net.addLink(1, 3, 24, true);
        net.addLink(0, 2, 22, true);
        net.addLink(2, 3, 19, true);

        net.runFloydWarshall();
        Packet p = new Packet(501, 0, 3, 8, "HTTP/3_QUIC_REQUEST");
        net.forwardPacket(p);
    }
}
`;
