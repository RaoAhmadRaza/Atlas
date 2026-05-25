from __future__ import annotations

from typing import Any

from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from apps.api.orchestrator.handlers.compress import compress_node
from apps.api.orchestrator.handlers.fuse import fuse_node
from apps.api.orchestrator.handlers.generate import generate_node
from apps.api.orchestrator.handlers.rerank import rerank_node
from apps.api.orchestrator.handlers.retrieve import retrieve_node
from apps.api.orchestrator.handlers.rewrite import rewrite_node
from apps.api.orchestrator.handlers.verify import verify_node, verify_route
from apps.api.orchestrator.state import QueryState

_pipeline: CompiledStateGraph[Any, Any, Any, Any] | None = None


def build_pipeline() -> CompiledStateGraph[Any, Any, Any, Any]:
    graph: StateGraph[QueryState] = StateGraph(QueryState)

    graph.add_node("rewrite", rewrite_node)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("fuse", fuse_node)
    graph.add_node("rerank", rerank_node)
    graph.add_node("compress", compress_node)
    graph.add_node("generate", generate_node)
    graph.add_node("verify", verify_node)

    graph.set_entry_point("rewrite")
    graph.add_edge("rewrite", "retrieve")
    graph.add_edge("retrieve", "fuse")
    graph.add_edge("fuse", "rerank")
    graph.add_edge("rerank", "compress")
    graph.add_edge("compress", "generate")
    graph.add_edge("generate", "verify")
    graph.add_conditional_edges("verify", verify_route, {"generate": "generate", END: END})

    return graph.compile()


def get_pipeline() -> CompiledStateGraph[Any, Any, Any, Any]:
    global _pipeline
    if _pipeline is None:
        _pipeline = build_pipeline()
    return _pipeline
