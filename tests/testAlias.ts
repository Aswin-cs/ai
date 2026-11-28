import Module from "node:module";
import path from "node:path";

type ResolveFilenameFn = (
  request: string,
  parent: NodeModule | null | undefined,
  isMain: boolean,
  options?: unknown
) => string;

const nodeModule = Module as unknown as {
  _resolveFilename: ResolveFilenameFn;
  __vayupulseAliasInstalled?: boolean;
};

if (!nodeModule.__vayupulseAliasInstalled) {
  const distRoot = path.resolve(__dirname, "..");
  const origResolve = nodeModule._resolveFilename.bind(Module);
  nodeModule._resolveFilename = function (
    request: string,
    parent: NodeModule | null | undefined,
    isMain: boolean,
    options?: unknown
  ) {
    if (request.startsWith("@/")) {
      const target = path.join(distRoot, request.slice(2));
      return origResolve(target, parent, isMain, options);
    }
    return origResolve(request, parent, isMain, options);
  };
  nodeModule.__vayupulseAliasInstalled = true;
}

export const authStubState: {
  session: { user: { email: string; name?: string } } | null;
} = {
  session: null,
};

const nextAuthPath = require.resolve("next-auth");
require.cache[nextAuthPath] = {
  id: nextAuthPath,
  filename: nextAuthPath,
  loaded: true,
  exports: {
    __esModule: true,
    default: () => () => null,
    getServerSession: async () => authStubState.session,
  },
} as unknown as NodeModule;
